import "server-only";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { parseDateOnly, isReviewDurationValid } from "@/domain/product";
import { ProductError } from "@/application/product/errors";
import { isWeeklyPeriodGoalsCompleted } from "@/domain/planning";

function mapError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") throw new ProductError("DUPLICATE", "This review or order already exists.");
    if (error.code === "P2003") throw new ProductError("CONFLICT", "This record is referenced by historical data.");
    if (error.code === "P2025") throw new ProductError("NOT_FOUND", "The requested review record no longer exists.");
  }
  throw error;
}

export async function listReviewCycles(prisma: PrismaClient) {
  return prisma.reviewCycle.findMany({
    include: {
      firstWeek: { include: { goals: true } }, secondWeek: { include: { goals: true } }, thirdWeek: { include: { goals: true } },
      review: {
        include: {
          entries: {
            include: { topic: { include: { lesson: { include: { learningItem: true } } } } },
            orderBy: { sortOrder: "asc" },
          },
        },
      },
    }, orderBy: { cycleNumber: "desc" },
  });
}

export async function decideReviewCycle(prisma: PrismaClient, id: string, decision: "ACCEPTED" | "SKIPPED", now = new Date()) {
  try {
    const cycle = await prisma.reviewCycle.findUniqueOrThrow({ where: { id }, include: {
      firstWeek: { include: { goals: true } }, secondWeek: { include: { goals: true } }, thirdWeek: { include: { goals: true } },
    } });
    if (cycle.decision !== "PENDING" || !cycle.goalsCompletedAt || !cycle.offeredAt) throw new ProductError("CONFLICT", "This cycle has not offered a review.");
    if (![cycle.firstWeek, cycle.secondWeek, cycle.thirdWeek].every((week) => isWeeklyPeriodGoalsCompleted(week.goals))) {
      throw new ProductError("CONFLICT", "All three weeks must still have at least one completed Main goal and all Main goals completed.");
    }
    await prisma.reviewCycle.update({ where: { id }, data: { decision, decidedAt: now } });
  } catch (error) { mapError(error); }
}

type ReviewInput = {
  reviewCycleId: string; startsOn: string; endsOn: string; durationMinutes: number | null;
  status: "IN_PROGRESS" | "COMPLETED"; rating: number | null; notes: string | null;
};

export async function createReview(prisma: PrismaClient, input: ReviewInput) {
  if (!isReviewDurationValid(input.startsOn, input.endsOn)) throw new ProductError("INVALID_REFERENCE", "A review period must last one or two calendar days.");
  try {
    const cycle = await prisma.reviewCycle.findUniqueOrThrow({ where: { id: input.reviewCycleId }, include: {
      firstWeek: { include: { goals: true } }, secondWeek: { include: { goals: true } }, thirdWeek: { include: { goals: true } },
    } });
    if (cycle.decision !== "ACCEPTED") throw new ProductError("CONFLICT", "Accept this optional review cycle before creating its review record.");
    if (![cycle.firstWeek, cycle.secondWeek, cycle.thirdWeek].every((week) => isWeeklyPeriodGoalsCompleted(week.goals))) {
      throw new ProductError("CONFLICT", "The review requires three currently completed planning periods.");
    }
    const review = await prisma.review.create({ data: {
      ...input, startsOn: parseDateOnly(input.startsOn), endsOn: parseDateOnly(input.endsOn),
    } });
    return review.id;
  } catch (error) { mapError(error); }
}

export async function updateReview(prisma: PrismaClient, id: string, input: ReviewInput) {
  if (!isReviewDurationValid(input.startsOn, input.endsOn)) throw new ProductError("INVALID_REFERENCE", "A review period must last one or two calendar days.");
  try { await prisma.review.update({ where: { id }, data: {
    ...input, startsOn: parseDateOnly(input.startsOn), endsOn: parseDateOnly(input.endsOn),
  } }); } catch (error) { mapError(error); }
}

type EntryInput = { reviewId: string; kind: "TOPIC" | "TASK"; title: string; topicId: string | null; result: string | null; rating: number | null; sortOrder: number };

export async function createReviewEntry(prisma: PrismaClient, input: EntryInput) {
  try { return (await prisma.reviewEntry.create({ data: input, select: { id: true } })).id; } catch (error) { mapError(error); }
}

export async function updateReviewEntry(prisma: PrismaClient, id: string, input: EntryInput) {
  try { await prisma.reviewEntry.update({ where: { id }, data: input }); } catch (error) { mapError(error); }
}

export async function deleteReviewEntry(prisma: PrismaClient, id: string) {
  try { await prisma.reviewEntry.delete({ where: { id } }); } catch (error) { mapError(error); }
}

export async function listActiveTopics(prisma: PrismaClient) {
  return prisma.topic.findMany({ where: { archivedAt: null }, include: { lesson: { include: { learningItem: true } } }, orderBy: { title: "asc" } });
}
