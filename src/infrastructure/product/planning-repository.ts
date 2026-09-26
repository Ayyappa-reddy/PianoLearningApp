import "server-only";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { endDateExclusive, isWeeklyPeriodGoalsCompleted, planCarryForward, targetKeyForGoal } from "@/domain/planning";
import { assertNextPeriodStart, parseDateOnly, targetRelation } from "@/domain/product";
import { ProductError } from "@/application/product/errors";
import { getOrCreateOwnerProfile } from "./profile-repository";

function handlePrismaError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") throw new ProductError("DUPLICATE", "That goal or order already exists in this period.");
    if (error.code === "P2003") throw new ProductError("CONFLICT", "This record is still referenced by historical data.");
    if (error.code === "P2025") throw new ProductError("NOT_FOUND", "The requested record no longer exists.");
  }
  throw error;
}

const event = (carryForwardId: string, planningWeekId: string, eventType: "CANDIDATE_CREATED" | "OFFERED" | "LATER" | "ADDED" | "AUTO_ADDED_THRESHOLD" | "RESOLVED" | "DISMISSED" | "LEARN_LATER_MARKED", fromGoalId: string | null, toGoalId: string | null = null) => ({
  carryForwardId, planningWeekId, eventType, fromGoalId, toGoalId,
});

function goalTarget(goal: {
  learningItemId: string | null; lessonId: string | null; topicId: string | null; songId: string | null;
  songSectionId: string | null; personalGoalId: string | null; reviewEntryId: string | null;
}) {
  return {
    learningItemId: goal.learningItemId, lessonId: goal.lessonId, topicId: goal.topicId,
    songId: goal.songId, songSectionId: goal.songSectionId, personalGoalId: goal.personalGoalId,
    reviewEntryId: goal.reviewEntryId,
  };
}

function targetIdentity(goal: Parameters<typeof goalTarget>[0]) {
  return targetKeyForGoal(goal);
}

async function appendCompletionCycleOffer(tx: Prisma.TransactionClient, periodId: string, now: Date) {
  const cycle = await tx.reviewCycle.findFirst({
    where: { OR: [{ firstWeekId: periodId }, { secondWeekId: periodId }, { thirdWeekId: periodId }] },
    include: { firstWeek: { select: { mainGoalsCompletedAt: true } }, secondWeek: { select: { mainGoalsCompletedAt: true } }, thirdWeek: { select: { mainGoalsCompletedAt: true } } },
  });
  if (!cycle || cycle.decision !== "NOT_OFFERED") return;
  if (!cycle.firstWeek.mainGoalsCompletedAt || !cycle.secondWeek.mainGoalsCompletedAt || !cycle.thirdWeek.mainGoalsCompletedAt) return;
  await tx.reviewCycle.update({
    where: { id: cycle.id }, data: { goalsCompletedAt: now, offeredAt: now, decision: "PENDING" },
  });
}

async function refreshPeriodCompletion(tx: Prisma.TransactionClient, periodId: string, now: Date) {
  const period = await tx.weeklyPeriod.findUniqueOrThrow({ where: { id: periodId }, include: { goals: true } });
  const completed = isWeeklyPeriodGoalsCompleted(period.goals);
  const marker = completed ? period.mainGoalsCompletedAt ?? now : null;
  if (marker?.getTime() !== period.mainGoalsCompletedAt?.getTime()) {
    await tx.weeklyPeriod.update({ where: { id: periodId }, data: { mainGoalsCompletedAt: marker } });
  }
  if (completed) await appendCompletionCycleOffer(tx, periodId, now);
}

async function addCarryGoal(tx: Prisma.TransactionClient, weekId: string, carryId: string, source: {
  id: string; title: string; notes: string | null; learningItemId: string | null; lessonId: string | null;
  topicId: string | null; songId: string | null; songSectionId: string | null; personalGoalId: string | null;
  reviewEntryId: string | null;
}, eventType: "ADDED" | "AUTO_ADDED_THRESHOLD") {
  const duplicate = await tx.weeklyGoal.findFirst({
    where: { weeklyPeriodId: weekId, ...Object.fromEntries(Object.entries(goalTarget(source)).filter(([, value]) => value !== null)) },
    select: { id: true },
  });
  if (duplicate) throw new ProductError("DUPLICATE", "This target is already a goal in the selected week.");
  const newGoal = await tx.weeklyGoal.create({
    data: { weeklyPeriodId: weekId, kind: "MAIN", title: source.title, notes: source.notes, status: "NOT_TOUCHED", sourceGoalId: source.id, ...goalTarget(source) },
    select: { id: true },
  });
  await tx.weeklyGoalStatusChange.create({ data: { weeklyGoalId: newGoal.id, fromStatus: null, toStatus: "NOT_TOUCHED" } });
  await tx.goalCarryForward.update({ where: { id: carryId }, data: { currentGoalId: newGoal.id, state: "IN_WEEK" } });
  await tx.goalCarryForwardEvent.create({ data: event(carryId, weekId, eventType, source.id, newGoal.id) });
  await refreshPeriodCompletion(tx, weekId, new Date());
  return newGoal.id;
}

export async function listPlanning(prisma: PrismaClient) {
  const [profile, periods, personalGoals] = await Promise.all([
    getOrCreateOwnerProfile(prisma),
    prisma.weeklyPeriod.findMany({
      include: {
        goals: {
          include: {
            practiceRecords: { include: { practiceRecord: { select: { id: true, practicedOn: true, durationMinutes: true } } } },
            statusChanges: { orderBy: { recordedAt: "asc" } },
          },
        },
        firstForCycle: { include: { review: true } }, secondForCycle: { include: { review: true } }, thirdForCycle: { include: { review: true } },
      }, orderBy: { sequenceNo: "desc" },
    }),
    prisma.personalGoal.findMany({ where: { archivedAt: null }, orderBy: [{ status: "asc" }, { createdAt: "desc" }] }),
  ]);
  return { profile, periods, personalGoals };
}

export async function createWeeklyPeriod(prisma: PrismaClient, startOn: string, now = new Date()) {
  const start = parseDateOnly(startOn);

  try {
    return await prisma.$transaction(async (tx) => {
      const profile = await getOrCreateOwnerProfile(tx);
      const previous = await tx.weeklyPeriod.findFirst({ orderBy: { sequenceNo: "desc" }, select: { id: true, sequenceNo: true, startOn: true } });
      assertNextPeriodStart(previous ? previous.startOn.toISOString().slice(0, 10) : null, startOn);
      const period = await tx.weeklyPeriod.create({
        data: { sequenceNo: (previous?.sequenceNo ?? 0) + 1, startOn: start, timezoneName: profile.timezoneName },
      });

      const before = await tx.weeklyPeriod.findMany({ where: { id: { not: period.id }, startOn: { lt: start } }, include: { goals: true } });
      const previousEnd = new Map(before.map((week) => [week.id, endDateExclusive(week.startOn.toISOString().slice(0, 10))]));
      const endedWeeks = before.filter((week) => (previousEnd.get(week.id) ?? "") <= startOn);

      const activeThreads = await tx.goalCarryForward.findMany({
        where: { state: { in: ["IN_WEEK", "PENDING"] } }, select: { id: true, currentGoalId: true, state: true },
      });
      const activeByGoal = new Map(activeThreads.map((thread) => [thread.currentGoalId, thread]));

      for (const week of endedWeeks) {
        for (const goal of week.goals) {
          if (goal.status === "COMPLETED") continue;
          const existing = activeByGoal.get(goal.id);
          if (existing) {
            if (existing.state === "IN_WEEK") {
              await tx.goalCarryForward.update({ where: { id: existing.id }, data: { state: "PENDING" } });
              await tx.goalCarryForwardEvent.create({ data: event(existing.id, period.id, "CANDIDATE_CREATED", goal.id) });
              existing.state = "PENDING";
            }
            continue;
          }
          const thread = await tx.goalCarryForward.create({ data: { originGoalId: goal.id, currentGoalId: goal.id, state: "PENDING" } });
          await tx.goalCarryForwardEvent.create({ data: event(thread.id, period.id, "CANDIDATE_CREATED", goal.id) });
          activeByGoal.set(goal.id, { id: thread.id, currentGoalId: goal.id, state: "PENDING" });
        }
      }

      const pending = await tx.goalCarryForward.findMany({
        where: { state: "PENDING" }, include: { currentGoal: true, originGoal: { include: { weeklyPeriod: { select: { sequenceNo: true } } } } },
        orderBy: { createdAt: "asc" },
      });
      const unique = [] as typeof pending;
      const seenTargets = new Set<string>();
      for (const item of pending) {
        const key = targetIdentity(item.currentGoal);
        if (key && seenTargets.has(key)) continue;
        if (key) seenTargets.add(key);
        unique.push(item);
      }

      if (unique.length >= 4) {
        for (const item of unique) await addCarryGoal(tx, period.id, item.id, item.currentGoal, "AUTO_ADDED_THRESHOLD");
      } else {
        for (const item of unique) await tx.goalCarryForwardEvent.create({ data: event(item.id, period.id, "OFFERED", item.currentGoalId) });
      }

      if (period.sequenceNo % 3 === 0) {
        const weeks = await tx.weeklyPeriod.findMany({ where: { sequenceNo: { gte: period.sequenceNo - 2, lte: period.sequenceNo } }, orderBy: { sequenceNo: "asc" } });
        if (weeks.length === 3 && weeks[0].sequenceNo + 1 === weeks[1].sequenceNo && weeks[1].sequenceNo + 1 === weeks[2].sequenceNo) {
          await tx.reviewCycle.create({ data: {
            cycleNumber: Math.ceil(period.sequenceNo / 3), firstWeekId: weeks[0].id,
            secondWeekId: weeks[1].id, thirdWeekId: weeks[2].id,
          } });
          await appendCompletionCycleOffer(tx, period.id, now);
        }
      }
      return { periodId: period.id, pendingCount: unique.length, autoAdded: unique.length >= 4 };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) { handlePrismaError(error); }
}

export async function createWeeklyGoal(prisma: PrismaClient, input: {
  weeklyPeriodId: string; kind: "MAIN" | "EXTRA"; title: string; notes: string | null; targetType: string; targetId: string | null;
}) {
  try {
    const target = targetRelation(input.targetType, input.targetId);
    return await prisma.$transaction(async (tx) => {
      if (Object.keys(target).length) {
        const duplicate = await tx.weeklyGoal.findFirst({ where: { weeklyPeriodId: input.weeklyPeriodId, ...Object.fromEntries(Object.entries(target).filter(([, value]) => value !== null)) }, select: { id: true } });
        if (duplicate) throw new ProductError("DUPLICATE", "This learning target is already a goal in this week.");
      }
      const result = await tx.weeklyGoal.create({ data: {
        weeklyPeriodId: input.weeklyPeriodId, kind: input.kind, title: input.title, notes: input.notes,
        status: "NOT_TOUCHED", ...target,
      }, select: { id: true } });
      await tx.weeklyGoalStatusChange.create({ data: { weeklyGoalId: result.id, fromStatus: null, toStatus: "NOT_TOUCHED" } });
      await refreshPeriodCompletion(tx, input.weeklyPeriodId, new Date());
      return result.id;
    });
  } catch (error) { handlePrismaError(error); }
}

export async function updateWeeklyGoalDetails(prisma: PrismaClient, id: string, input: {
  kind: "MAIN" | "EXTRA"; title: string; notes: string | null; targetType: string; targetId: string | null;
}) {
  try {
    const target = targetRelation(input.targetType, input.targetId);
    const { kind, title, notes } = input;
    await prisma.$transaction(async (tx) => {
      const existing = await tx.weeklyGoal.findUniqueOrThrow({ where: { id }, select: { weeklyPeriodId: true } });
      if (Object.keys(target).length) {
        const duplicate = await tx.weeklyGoal.findFirst({ where: { id: { not: id }, weeklyPeriodId: existing.weeklyPeriodId, ...Object.fromEntries(Object.entries(target).filter(([, value]) => value !== null)) }, select: { id: true } });
        if (duplicate) throw new ProductError("DUPLICATE", "This learning target is already a goal in this week.");
      }
      const goal = await tx.weeklyGoal.update({ where: { id }, data: { kind, title, notes, ...target }, select: { weeklyPeriodId: true } });
      await refreshPeriodCompletion(tx, goal.weeklyPeriodId, new Date());
    });
  } catch (error) { handlePrismaError(error); }
}

export async function deleteWeeklyGoal(prisma: PrismaClient, id: string) {
  try { await prisma.$transaction(async (tx) => {
    const goal = await tx.weeklyGoal.findUniqueOrThrow({ where: { id }, select: { weeklyPeriodId: true } });
    await tx.weeklyGoal.delete({ where: { id } });
    await refreshPeriodCompletion(tx, goal.weeklyPeriodId, new Date());
  }); } catch (error) { handlePrismaError(error); }
}

export async function updateWeeklyGoal(prisma: PrismaClient, input: {
  goalId: string; status: "NOT_TOUCHED" | "PARTIALLY_COMPLETED" | "COMPLETED";
  startedOn: string | null; completedOn: string | null; rating: number | null; notes: string | null;
}, now = new Date()) {
  try {
    await prisma.$transaction(async (tx) => {
      const old = await tx.weeklyGoal.findUniqueOrThrow({ where: { id: input.goalId } });
      const dateChanged = old.startedOn?.toISOString().slice(0, 10) !== input.startedOn || old.completedOn?.toISOString().slice(0, 10) !== input.completedOn;
      const statusChanged = old.status !== input.status;
      await tx.weeklyGoal.update({ where: { id: input.goalId }, data: {
        status: input.status, startedOn: input.startedOn ? parseDateOnly(input.startedOn) : null,
        completedOn: input.completedOn ? parseDateOnly(input.completedOn) : null, rating: input.rating, notes: input.notes,
      } });
      if (statusChanged || dateChanged) await tx.weeklyGoalStatusChange.create({ data: {
        weeklyGoalId: input.goalId, fromStatus: old.status, toStatus: input.status,
        effectiveOn: input.completedOn ? parseDateOnly(input.completedOn) : input.startedOn ? parseDateOnly(input.startedOn) : null,
        correctionNote: !statusChanged && dateChanged ? "Goal dates corrected." : null,
      } });

      await refreshPeriodCompletion(tx, old.weeklyPeriodId, now);

      if (input.status === "COMPLETED" && old.status !== "COMPLETED") {
        const threads = await tx.goalCarryForward.findMany({ where: { currentGoalId: old.id, state: { in: ["PENDING", "IN_WEEK"] } } });
        for (const thread of threads) {
          await tx.goalCarryForward.update({ where: { id: thread.id }, data: { state: "RESOLVED" } });
          await tx.goalCarryForwardEvent.create({ data: event(thread.id, old.weeklyPeriodId, "RESOLVED", old.id) });
        }
      }
    });
  } catch (error) { handlePrismaError(error); }
}

export async function deferWeeklyGoal(prisma: PrismaClient, goalId: string, planningWeekId: string) {
  try {
    await prisma.$transaction(async (tx) => {
      const goal = await tx.weeklyGoal.findUniqueOrThrow({ where: { id: goalId } });
      if (goal.weeklyPeriodId !== planningWeekId) throw new ProductError("INVALID_REFERENCE", "A goal can only be deferred from its own planning period.");
      if (goal.status === "COMPLETED") throw new ProductError("CONFLICT", "Completed goals cannot be deferred.");
      let thread = await tx.goalCarryForward.findFirst({ where: { currentGoalId: goal.id, state: { in: ["PENDING", "IN_WEEK"] } } });
      const now = new Date();
      if (!thread) thread = await tx.goalCarryForward.create({ data: { originGoalId: goal.id, currentGoalId: goal.id, state: "PENDING", firstDeferredAt: now } });
      await tx.goalCarryForward.update({ where: { id: thread.id }, data: { state: "PENDING", firstDeferredAt: thread.firstDeferredAt ?? now } });
      await tx.goalCarryForwardEvent.create({ data: event(thread.id, planningWeekId, "LEARN_LATER_MARKED", goal.id) });
    });
  } catch (error) { handlePrismaError(error); }
}

export async function undoDeferredWeeklyGoal(prisma: PrismaClient, goalId: string, planningWeekId: string) {
  try {
    await prisma.$transaction(async (tx) => {
      const thread = await tx.goalCarryForward.findFirst({
        where: { currentGoalId: goalId, state: "PENDING", events: { some: { planningWeekId, eventType: "LEARN_LATER_MARKED" } } },
      });
      if (!thread) throw new ProductError("NOT_FOUND", "This Learn Later decision is no longer available to undo.");
      await tx.goalCarryForward.update({ where: { id: thread.id }, data: { state: "DISMISSED" } });
      await tx.goalCarryForwardEvent.create({ data: event(thread.id, planningWeekId, "DISMISSED", goalId) });
    });
  } catch (error) { handlePrismaError(error); }
}

export async function decideCarryForward(prisma: PrismaClient, carryForwardId: string, weeklyPeriodId: string, decision: "ADD" | "LATER") {
  try {
    return await prisma.$transaction(async (tx) => {
      const thread = await tx.goalCarryForward.findUniqueOrThrow({ where: { id: carryForwardId }, include: { currentGoal: true } });
      if (thread.state !== "PENDING") throw new ProductError("CONFLICT", "This carry-forward item is no longer pending.");
      const week = await tx.weeklyPeriod.findUniqueOrThrow({ where: { id: weeklyPeriodId }, include: { goals: true } });
      const eventsForWeek = await tx.goalCarryForwardEvent.findMany({ where: { carryForwardId, planningWeekId: weeklyPeriodId } });
      if (!eventsForWeek.some((entry) => entry.eventType === "OFFERED")) throw new ProductError("CONFLICT", "This item was not offered for the selected planning period.");
      if (decision === "LATER") {
        await tx.goalCarryForwardEvent.create({ data: event(thread.id, week.id, "LATER", thread.currentGoalId) });
        return "later" as const;
      }
      const key = targetIdentity(thread.currentGoal);
      if (key) {
        const duplicates = await tx.weeklyGoal.findMany({ where: { weeklyPeriodId }, select: { learningItemId: true, lessonId: true, topicId: true, songId: true, songSectionId: true, personalGoalId: true, reviewEntryId: true } });
        if (duplicates.some((goal) => targetIdentity(goal) === key)) throw new ProductError("DUPLICATE", "This learning target is already present in this week.");
      }
      return await addCarryGoal(tx, week.id, thread.id, thread.currentGoal, "ADDED");
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) { handlePrismaError(error); }
}

export async function pendingOffers(prisma: PrismaClient, weeklyPeriodId: string) {
  const threads = await prisma.goalCarryForward.findMany({
    where: { state: "PENDING", events: { some: { planningWeekId: weeklyPeriodId, eventType: "OFFERED" } } },
    include: { currentGoal: true, originGoal: { include: { weeklyPeriod: { select: { sequenceNo: true } } }, }, events: { where: { planningWeekId: weeklyPeriodId } } },
    orderBy: { createdAt: "asc" },
  });
  return threads.filter((thread) => !thread.events.some((entry) => entry.eventType === "LATER"));
}

export async function createPersonalGoal(prisma: PrismaClient, input: {
  kind: "LONG_TERM" | "PRACTICE"; title: string; notes: string | null; status: "ACTIVE" | "COMPLETED" | "PAUSED" | "CANCELLED";
  startsOn: string | null; targetOn: string | null; completedOn: string | null; targetMinutes: number | null;
  targetPracticeDays: number | null; targetPeriod: "" | "WEEK" | "MONTH" | "YEAR" | "ALL_TIME"; rating: number | null;
}) {
  try { return await prisma.personalGoal.create({ data: {
    ...input, startsOn: input.startsOn ? parseDateOnly(input.startsOn) : null,
    targetOn: input.targetOn ? parseDateOnly(input.targetOn) : null,
    completedOn: input.completedOn ? parseDateOnly(input.completedOn) : null,
    targetPeriod: input.targetPeriod || null,
  } }); } catch (error) { handlePrismaError(error); }
}

export async function updatePersonalGoal(prisma: PrismaClient, id: string, input: {
  kind: "LONG_TERM" | "PRACTICE"; title: string; notes: string | null; status: "ACTIVE" | "COMPLETED" | "PAUSED" | "CANCELLED";
  startsOn: string | null; targetOn: string | null; completedOn: string | null; targetMinutes: number | null;
  targetPracticeDays: number | null; targetPeriod: "" | "WEEK" | "MONTH" | "YEAR" | "ALL_TIME"; rating: number | null;
}) {
  try { await prisma.personalGoal.update({ where: { id }, data: {
    ...input, startsOn: input.startsOn ? parseDateOnly(input.startsOn) : null,
    targetOn: input.targetOn ? parseDateOnly(input.targetOn) : null,
    completedOn: input.completedOn ? parseDateOnly(input.completedOn) : null,
    targetPeriod: input.targetPeriod || null,
  } }); } catch (error) { handlePrismaError(error); }
}

export async function archivePersonalGoal(prisma: PrismaClient, id: string) {
  try { await prisma.personalGoal.update({ where: { id }, data: { archivedAt: new Date() } }); } catch (error) { handlePrismaError(error); }
}
