import "server-only";
import { Prisma, type PrismaClient, type ProgressStatus } from "@/generated/prisma/client";
import { z } from "zod";
import { CatalogError } from "@/application/catalog/catalog-errors";
import type { CatalogRepository } from "@/application/catalog/catalog-repository";
import type { CategoryInput, LearningItemInput, LessonInput, TopicInput } from "@/validation/catalog";

const dateValue = (value: string | null) => value ? new Date(`${value}T00:00:00.000Z`) : null;

function mapError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") throw new CatalogError("DUPLICATE", "That value is already in use.");
    if (error.code === "P2003") throw new CatalogError("CONFLICT", "This record is still used by other catalog or historical data.");
    if (error.code === "P2025") throw new CatalogError("NOT_FOUND", "The requested record no longer exists.");
  }
  throw error;
}

function progressData(input: { status: ProgressStatus; startedOn: string | null; completedOn: string | null; timeTakenMinutes: number | null }) {
  return {
    status: input.status,
    startedOn: dateValue(input.startedOn),
    completedOn: dateValue(input.completedOn),
    timeTakenMinutes: input.timeTakenMinutes,
  };
}

function progressEffectiveDate(input: { completedOn: string | null; startedOn: string | null }) {
  return dateValue(input.completedOn ?? input.startedOn);
}

function hasProgressInput(input: { status: string; startedOn: string | null; completedOn: string | null }) {
  return input.status !== "NOT_STARTED" || input.startedOn !== null || input.completedOn !== null;
}

async function appendProgressHistory(
  tx: Prisma.TransactionClient,
  target: "learningItemId" | "lessonId" | "topicId",
  id: string,
  previous: { status: ProgressStatus; startedOn: Date | null; completedOn: Date | null },
  next: { status: ProgressStatus; startedOn: string | null; completedOn: string | null },
) {
  const fromDate = (value: Date | null) => value?.toISOString().slice(0, 10) ?? null;
  const changedStart = fromDate(previous.startedOn) !== next.startedOn;
  const changedCompletion = fromDate(previous.completedOn) !== next.completedOn;
  const changedStatus = previous.status !== next.status;
  const rows = [];
  if (changedStatus) rows.push({
    fromStatus: previous.status, toStatus: next.status,
    effectiveOn: progressEffectiveDate(next), correctionNote: null,
  });
  if (changedStart) rows.push({
    fromStatus: previous.status, toStatus: next.status,
    effectiveOn: dateValue(next.startedOn), correctionNote: "Started date corrected.",
  });
  if (changedCompletion) rows.push({
    fromStatus: previous.status, toStatus: next.status,
    effectiveOn: dateValue(next.completedOn), correctionNote: "Completion date corrected.",
  });
  for (const row of rows) await tx.learningProgressChange.create({ data: { ...row, [target]: id } });
}

export function createPrismaCatalogRepository(prisma: PrismaClient): CatalogRepository {
  const validId = (id: string) => z.uuid().safeParse(id).success;
  return {
    async listCategories() {
      return prisma.category.findMany({
        orderBy: [{ archivedAt: "asc" }, { name: "asc" }],
        include: { learningItems: { orderBy: [{ archivedAt: "asc" }, { title: "asc" }] } },
      });
    },
    async getCategory(id) {
      if (!validId(id)) return null;
      return prisma.category.findUnique({
        where: { id },
        include: { learningItems: { include: { category: true }, orderBy: [{ archivedAt: "asc" }, { title: "asc" }] } },
      });
    },
    async getItem(id) {
      if (!validId(id)) return null;
      return prisma.learningItem.findUnique({
        where: { id },
        include: {
          category: true,
          lessons: { include: { topics: { orderBy: { sortOrder: "asc" } } }, orderBy: [{ archivedAt: "asc" }, { createdAt: "asc" }] },
          prerequisites: { include: { prerequisiteItem: { select: { id: true, title: true, archivedAt: true } } } },
          prerequisiteFor: { include: { learningItem: { select: { id: true, title: true, archivedAt: true } } } },
        },
      });
    },
    async getLesson(id) {
      if (!validId(id)) return null;
      return prisma.lesson.findUnique({
        where: { id },
        include: {
          learningItem: { select: { id: true, title: true, archivedAt: true, category: true } },
          topics: { orderBy: { sortOrder: "asc" } },
        },
      });
    },
    async listActiveItemCandidates(exceptId) {
      const rows = await prisma.learningItem.findMany({
        where: { archivedAt: null, ...(exceptId ? { id: { not: exceptId } } : {}) },
        select: { id: true, title: true, category: { select: { name: true } } },
        orderBy: { title: "asc" },
      });
      return rows.map(({ id, title, category }) => ({ id, title, categoryName: category.name }));
    },
    async createCategory(input: CategoryInput) {
      try { return (await prisma.category.create({ data: input, select: { id: true } })).id; } catch (error) { mapError(error); }
    },
    async updateCategory(id, input) {
      try { await prisma.category.update({ where: { id }, data: input }); } catch (error) { mapError(error); }
    },
    async deleteOrArchiveCategory(id) {
      try { await prisma.category.delete({ where: { id } }); return "deleted"; }
      catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
          try { await prisma.category.update({ where: { id }, data: { archivedAt: new Date() } }); return "archived"; } catch (archiveError) { mapError(archiveError); }
        }
        mapError(error);
      }
    },
    async createItem(input: LearningItemInput) {
      try {
        const data = progressData(input);
        const created = await prisma.$transaction(async (tx) => {
          const category = await tx.category.findFirst({ where: { id: input.categoryId, archivedAt: null }, select: { id: true } });
          if (!category) throw new CatalogError("INVALID_REFERENCE", "Choose an active category.");
          const row = await tx.learningItem.create({ data: { ...input, ...data }, select: { id: true } });
          if (hasProgressInput(input)) await tx.learningProgressChange.create({ data: {
            learningItemId: row.id, fromStatus: null, toStatus: input.status, effectiveOn: progressEffectiveDate(input),
          } });
          return row;
        });
        return created.id;
      } catch (error) { mapError(error); }
    },
    async updateItem(id, input) {
      try {
        await prisma.$transaction(async (tx) => {
          const old = await tx.learningItem.findUniqueOrThrow({ where: { id } });
          const category = await tx.category.findFirst({
            where: { id: input.categoryId, OR: [{ archivedAt: null }, { id: old.categoryId }] }, select: { id: true },
          });
          if (!category) throw new CatalogError("INVALID_REFERENCE", "Choose an active category.");
          await tx.learningItem.update({ where: { id }, data: { ...input, ...progressData(input) } });
          await appendProgressHistory(tx, "learningItemId", id, old, input);
        });
      } catch (error) { mapError(error); }
    },
    async deleteOrArchiveItem(id) {
      try { await prisma.learningItem.delete({ where: { id } }); return "deleted"; }
      catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
          try { await prisma.learningItem.update({ where: { id }, data: { archivedAt: new Date() } }); return "archived"; } catch (archiveError) { mapError(archiveError); }
        }
        mapError(error);
      }
    },
    async createLesson(input: LessonInput) {
      try {
        const created = await prisma.$transaction(async (tx) => {
          const item = await tx.learningItem.findFirst({ where: { id: input.learningItemId, archivedAt: null }, select: { id: true } });
          if (!item) throw new CatalogError("INVALID_REFERENCE", "Choose an active learning item.");
          const row = await tx.lesson.create({ data: { ...input, ...progressData(input) }, select: { id: true } });
          if (hasProgressInput(input)) await tx.learningProgressChange.create({ data: {
            lessonId: row.id, fromStatus: null, toStatus: input.status, effectiveOn: progressEffectiveDate(input),
          } });
          return row;
        });
        return created.id;
      } catch (error) { mapError(error); }
    },
    async updateLesson(id, input) {
      try {
        await prisma.$transaction(async (tx) => {
          const old = await tx.lesson.findUniqueOrThrow({ where: { id } });
          const item = await tx.learningItem.findFirst({
            where: { id: input.learningItemId, OR: [{ archivedAt: null }, { id: old.learningItemId }] }, select: { id: true },
          });
          if (!item) throw new CatalogError("INVALID_REFERENCE", "Choose an active learning item.");
          await tx.lesson.update({ where: { id }, data: { ...input, ...progressData(input) } });
          await appendProgressHistory(tx, "lessonId", id, old, input);
        });
      } catch (error) { mapError(error); }
    },
    async deleteOrArchiveLesson(id) {
      try { await prisma.lesson.delete({ where: { id } }); return "deleted"; }
      catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
          try { await prisma.lesson.update({ where: { id }, data: { archivedAt: new Date() } }); return "archived"; } catch (archiveError) { mapError(archiveError); }
        }
        mapError(error);
      }
    },
    async createTopic(input: TopicInput) {
      try {
        await prisma.$transaction(async (tx) => {
          const lesson = await tx.lesson.findFirst({ where: { id: input.lessonId, archivedAt: null }, select: { id: true, learningItem: { select: { archivedAt: true } } } });
          if (!lesson || lesson.learningItem.archivedAt) throw new CatalogError("INVALID_REFERENCE", "Choose an active lesson under an active learning item.");
          const row = await tx.topic.create({ data: { ...input, ...progressData(input) }, select: { id: true } });
          if (hasProgressInput(input)) await tx.learningProgressChange.create({ data: {
            topicId: row.id, fromStatus: null, toStatus: input.status, effectiveOn: progressEffectiveDate(input),
          } });
        });
      } catch (error) { mapError(error); }
    },
    async updateTopic(id, input) {
      try {
        await prisma.$transaction(async (tx) => {
          const old = await tx.topic.findUniqueOrThrow({ where: { id } });
          const lesson = await tx.lesson.findFirst({
            where: { id: input.lessonId, OR: [{ archivedAt: null }, { id: old.lessonId }] }, select: { id: true },
          });
          if (!lesson) throw new CatalogError("INVALID_REFERENCE", "Choose an active lesson.");
          await tx.topic.update({ where: { id }, data: { ...input, ...progressData(input) } });
          await appendProgressHistory(tx, "topicId", id, old, input);
        });
      } catch (error) { mapError(error); }
    },
    async deleteOrArchiveTopic(id) {
      try { await prisma.topic.delete({ where: { id } }); return "deleted"; }
      catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
          try { await prisma.topic.update({ where: { id }, data: { archivedAt: new Date() } }); return "archived"; } catch (archiveError) { mapError(archiveError); }
        }
        mapError(error);
      }
    },
    async addPrerequisite(learningItemId, prerequisiteItemId) {
      try { await prisma.learningPrerequisite.create({ data: { learningItemId, prerequisiteItemId } }); } catch (error) { mapError(error); }
    },
    async removePrerequisite(learningItemId, prerequisiteItemId) {
      try { await prisma.learningPrerequisite.delete({ where: { learningItemId_prerequisiteItemId: { learningItemId, prerequisiteItemId } } }); }
      catch (error) { mapError(error); }
    },
  };
}
