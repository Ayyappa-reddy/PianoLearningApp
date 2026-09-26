import "server-only";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { parseDateOnly } from "@/domain/product";
import { ProductError } from "@/application/product/errors";

function handlePrismaError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") throw new ProductError("DUPLICATE", "That order or record already exists.");
    if (error.code === "P2003") throw new ProductError("CONFLICT", "This record is still used by historical data and cannot be deleted.");
    if (error.code === "P2025") throw new ProductError("NOT_FOUND", "The requested record no longer exists.");
  }
  throw error;
}

type PracticeInput = {
  practicedOn: string; durationMinutes: number; categoryId: string | null; learningItemId: string | null;
  lessonId: string | null; topicId: string | null; songId: string | null; songSectionId: string | null;
  weeklyGoalIds: string[]; rating: number | null; notes: string | null; recordingReference: string | null;
};

async function validatePracticeTargets(tx: Prisma.TransactionClient, input: PracticeInput) {
  if (input.topicId) {
    const topic = await tx.topic.findUnique({ where: { id: input.topicId }, select: { lessonId: true, lesson: { select: { learningItemId: true } } } });
    if (!topic || input.lessonId && input.lessonId !== topic.lessonId || input.learningItemId && input.learningItemId !== topic.lesson.learningItemId) {
      throw new ProductError("INVALID_REFERENCE", "The selected topic, lesson, and learning item do not belong together.");
    }
  }
  if (input.lessonId) {
    const lesson = await tx.lesson.findUnique({ where: { id: input.lessonId }, select: { learningItemId: true } });
    if (!lesson || input.learningItemId && input.learningItemId !== lesson.learningItemId) {
      throw new ProductError("INVALID_REFERENCE", "The selected lesson does not belong to that learning item.");
    }
  }
  if (input.songSectionId) {
    const section = await tx.songSection.findUnique({ where: { id: input.songSectionId }, select: { songId: true } });
    if (!section || input.songId && input.songId !== section.songId) {
      throw new ProductError("INVALID_REFERENCE", "The selected section does not belong to that song.");
    }
  }
  if (input.weeklyGoalIds.length) {
    const ids = [...new Set(input.weeklyGoalIds)];
    const count = await tx.weeklyGoal.count({ where: { id: { in: ids } } });
    if (count !== ids.length) throw new ProductError("INVALID_REFERENCE", "One or more related weekly goals no longer exist.");
  }
}

export async function listPractice(prisma: PrismaClient) {
  const [records, categories, items, songs, goals] = await Promise.all([
    prisma.practiceRecord.findMany({ include: { category: true, learningItem: true, lesson: true, topic: true, song: true, songSection: true, weeklyGoals: { include: { weeklyGoal: { include: { weeklyPeriod: true } } } } }, orderBy: [{ practicedOn: "desc" }, { recordedAt: "desc" }] }),
    prisma.category.findMany({ where: { archivedAt: null }, orderBy: { name: "asc" } }),
    prisma.learningItem.findMany({ where: { archivedAt: null }, include: { lessons: { where: { archivedAt: null }, include: { topics: { where: { archivedAt: null } } } }, category: true }, orderBy: { title: "asc" } }),
    prisma.song.findMany({ where: { archivedAt: null }, include: { sections: { where: { archivedAt: null }, orderBy: { sortOrder: "asc" } } }, orderBy: { title: "asc" } }),
    prisma.weeklyGoal.findMany({ include: { weeklyPeriod: true }, orderBy: { createdAt: "desc" }, take: 100 }),
  ]);
  return { records, categories, items, songs, goals };
}

export async function createPracticeRecord(prisma: PrismaClient, input: PracticeInput) {
  try {
    return await prisma.$transaction(async (tx) => {
      await validatePracticeTargets(tx, input);
      const { weeklyGoalIds, practicedOn, ...rest } = input;
      const record = await tx.practiceRecord.create({ data: {
        ...rest, practicedOn: parseDateOnly(practicedOn),
        weeklyGoals: { create: [...new Set(weeklyGoalIds)].map((weeklyGoalId) => ({ weeklyGoalId })) },
      } });
      return record.id;
    });
  } catch (error) { handlePrismaError(error); }
}

export async function updatePracticeRecord(prisma: PrismaClient, id: string, input: PracticeInput) {
  try {
    await prisma.$transaction(async (tx) => {
      await validatePracticeTargets(tx, input);
      const { weeklyGoalIds, practicedOn, ...rest } = input;
      await tx.practiceRecord.update({ where: { id }, data: { ...rest, practicedOn: parseDateOnly(practicedOn) } });
      await tx.weeklyGoalPracticeRecord.deleteMany({ where: { practiceRecordId: id } });
      if (weeklyGoalIds.length) await tx.weeklyGoalPracticeRecord.createMany({ data: [...new Set(weeklyGoalIds)].map((weeklyGoalId) => ({ practiceRecordId: id, weeklyGoalId })) });
    });
  } catch (error) { handlePrismaError(error); }
}

export async function deletePracticeRecord(prisma: PrismaClient, id: string) {
  try { await prisma.practiceRecord.delete({ where: { id } }); } catch (error) { handlePrismaError(error); }
}

export async function listSongs(prisma: PrismaClient) {
  const [songs, categories] = await Promise.all([
    prisma.song.findMany({ where: { archivedAt: null }, include: { category: true, sections: { orderBy: [{ archivedAt: "asc" }, { sortOrder: "asc" }] } }, orderBy: { title: "asc" } }),
    prisma.category.findMany({ where: { archivedAt: null }, orderBy: { name: "asc" } }),
  ]);
  return { songs, categories };
}

type SongInput = {
  categoryId: string | null; title: string; composer: string | null; difficulty: number | null;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED"; addedOn: string; startedOn: string | null;
  completedOn: string | null; rating: number | null; notes: string | null;
};

async function saveSongProgress(tx: Prisma.TransactionClient, id: string, before: { status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED"; startedOn: Date | null; completedOn: Date | null }, next: SongInput) {
  const changes = [
    before.status !== next.status ? { effectiveOn: next.completedOn ?? next.startedOn, correctionNote: null } : null,
    before.startedOn?.toISOString().slice(0, 10) !== next.startedOn ? { effectiveOn: next.startedOn, correctionNote: "Started date corrected." } : null,
    before.completedOn?.toISOString().slice(0, 10) !== next.completedOn ? { effectiveOn: next.completedOn, correctionNote: "Completion date corrected." } : null,
  ].filter((change): change is { effectiveOn: string | null; correctionNote: string | null } => change !== null);
  for (const change of changes) await tx.learningProgressChange.create({ data: {
    songId: id, fromStatus: before.status, toStatus: next.status,
    effectiveOn: change.effectiveOn ? parseDateOnly(change.effectiveOn) : null,
    correctionNote: change.correctionNote,
  } });
}

export async function createSong(prisma: PrismaClient, input: SongInput) {
  try {
    return await prisma.$transaction(async (tx) => {
      const song = await tx.song.create({ data: {
        ...input, addedOn: parseDateOnly(input.addedOn), startedOn: input.startedOn ? parseDateOnly(input.startedOn) : null,
        completedOn: input.completedOn ? parseDateOnly(input.completedOn) : null,
      }, select: { id: true } });
      if (input.status !== "NOT_STARTED" || input.startedOn || input.completedOn) await tx.learningProgressChange.create({ data: {
        songId: song.id, toStatus: input.status, effectiveOn: input.completedOn ? parseDateOnly(input.completedOn) : input.startedOn ? parseDateOnly(input.startedOn) : null,
      } });
      return song.id;
    });
  } catch (error) { handlePrismaError(error); }
}

export async function updateSong(prisma: PrismaClient, id: string, input: SongInput) {
  try {
    await prisma.$transaction(async (tx) => {
      const before = await tx.song.findUniqueOrThrow({ where: { id } });
      await tx.song.update({ where: { id }, data: {
        ...input, addedOn: parseDateOnly(input.addedOn), startedOn: input.startedOn ? parseDateOnly(input.startedOn) : null,
        completedOn: input.completedOn ? parseDateOnly(input.completedOn) : null,
      } });
      await saveSongProgress(tx, id, before, input);
    });
  } catch (error) { handlePrismaError(error); }
}

export async function archiveOrDeleteSong(prisma: PrismaClient, id: string) {
  try { await prisma.song.delete({ where: { id } }); return "deleted" as const; }
  catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      try { await prisma.song.update({ where: { id }, data: { archivedAt: new Date() } }); return "archived" as const; } catch (archiveError) { handlePrismaError(archiveError); }
    }
    handlePrismaError(error);
  }
}

type SectionInput = {
  songId: string; title: string; sortOrder: number; status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  startedOn: string | null; completedOn: string | null; rating: number | null; notes: string | null;
};

export async function createSongSection(prisma: PrismaClient, input: SectionInput) {
  try {
    return await prisma.$transaction(async (tx) => {
      const section = await tx.songSection.create({ data: {
        ...input, startedOn: input.startedOn ? parseDateOnly(input.startedOn) : null,
        completedOn: input.completedOn ? parseDateOnly(input.completedOn) : null,
      }, select: { id: true } });
      if (input.status !== "NOT_STARTED" || input.startedOn || input.completedOn) await tx.learningProgressChange.create({ data: {
        songSectionId: section.id, toStatus: input.status, effectiveOn: input.completedOn ? parseDateOnly(input.completedOn) : input.startedOn ? parseDateOnly(input.startedOn) : null,
      } });
      return section.id;
    });
  } catch (error) { handlePrismaError(error); }
}

export async function updateSongSection(prisma: PrismaClient, id: string, input: SectionInput) {
  try {
    await prisma.$transaction(async (tx) => {
      const before = await tx.songSection.findUniqueOrThrow({ where: { id } });
      await tx.songSection.update({ where: { id }, data: {
        ...input, startedOn: input.startedOn ? parseDateOnly(input.startedOn) : null,
        completedOn: input.completedOn ? parseDateOnly(input.completedOn) : null,
      } });
      const changes = [
        before.status !== input.status ? { effectiveOn: input.completedOn ?? input.startedOn, correctionNote: null } : null,
        before.startedOn?.toISOString().slice(0, 10) !== input.startedOn ? { effectiveOn: input.startedOn, correctionNote: "Started date corrected." } : null,
        before.completedOn?.toISOString().slice(0, 10) !== input.completedOn ? { effectiveOn: input.completedOn, correctionNote: "Completion date corrected." } : null,
      ].filter((change): change is { effectiveOn: string | null; correctionNote: string | null } => change !== null);
      for (const change of changes) await tx.learningProgressChange.create({ data: {
        songSectionId: id, fromStatus: before.status, toStatus: input.status,
        effectiveOn: change.effectiveOn ? parseDateOnly(change.effectiveOn) : null, correctionNote: change.correctionNote,
      } });
    });
  } catch (error) { handlePrismaError(error); }
}

export async function archiveOrDeleteSongSection(prisma: PrismaClient, id: string) {
  try { await prisma.songSection.delete({ where: { id } }); return "deleted" as const; }
  catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      try { await prisma.songSection.update({ where: { id }, data: { archivedAt: new Date() } }); return "archived" as const; } catch (archiveError) { handlePrismaError(archiveError); }
    }
    handlePrismaError(error);
  }
}
