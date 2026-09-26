export const WEEK_LENGTH_DAYS = 7;
export const INDIVIDUAL_CARRY_FORWARD_LIMIT = 3;

export type WeeklyGoalKind = "MAIN" | "EXTRA";
export type WeeklyGoalStatus =
  | "NOT_TOUCHED"
  | "PARTIALLY_COMPLETED"
  | "COMPLETED";

export interface WeeklyGoalSnapshot {
  id: string;
  kind: WeeklyGoalKind;
  status: WeeklyGoalStatus;
}

export interface WeeklyPeriodSnapshot {
  sequenceNo: number;
  goals: readonly WeeklyGoalSnapshot[];
}

export interface CarryForwardCandidate {
  id: string;
  title: string;
  originGoalId: string;
  targetKey: string | null;
}

export type CarryForwardAction =
  | { kind: "ASK_INDIVIDUALLY"; items: readonly CarryForwardCandidate[] }
  | { kind: "AUTO_ADD_AS_MAIN"; items: readonly CarryForwardCandidate[] }
  | { kind: "NONE"; items: readonly [] };

export function endDateExclusive(startDate: string): string {
  const start = parseDateOnly(startDate);
  start.setUTCDate(start.getUTCDate() + WEEK_LENGTH_DAYS);
  return formatDateOnly(start);
}

export function isInsideWeeklyPeriod(date: string, startDate: string): boolean {
  const endDate = endDateExclusive(startDate);
  return date >= startDate && date < endDate;
}

export function periodsOverlap(firstStart: string, secondStart: string): boolean {
  return firstStart < endDateExclusive(secondStart) && secondStart < endDateExclusive(firstStart);
}

export function targetKeyForGoal(target: Record<string, string | null | undefined>): string | null {
  const keys = ["learningItemId", "lessonId", "topicId", "songId", "songSectionId", "personalGoalId", "reviewEntryId"];
  const values = keys.flatMap((key) => target[key] ? [[key, target[key] as string] as const] : []);
  if (values.length > 1) throw new Error("A weekly goal can have no more than one linked target.");
  return values.length ? `${values[0][0]}:${values[0][1]}` : null;
}

export function preserveCompletionTimestamp(
  existing: Date | null,
  goals: readonly WeeklyGoalSnapshot[],
  now: Date,
): Date | null {
  if (existing) return existing;
  return isWeeklyPeriodGoalsCompleted(goals) ? now : null;
}

export function isWeeklyPeriodGoalsCompleted(
  goals: readonly WeeklyGoalSnapshot[],
): boolean {
  const mainGoals = goals.filter((goal) => goal.kind === "MAIN");
  return mainGoals.length > 0 && mainGoals.every((goal) => goal.status === "COMPLETED");
}

export function isReviewCycleEligible(
  periods: readonly WeeklyPeriodSnapshot[],
): boolean {
  if (periods.length !== 3) return false;

  const ordered = [...periods].sort((a, b) => a.sequenceNo - b.sequenceNo);
  const areConsecutive = ordered[1].sequenceNo === ordered[0].sequenceNo + 1
    && ordered[2].sequenceNo === ordered[1].sequenceNo + 1;

  return areConsecutive
    && ordered.every((period) => isWeeklyPeriodGoalsCompleted(period.goals));
}

export function planCarryForward(
  pendingItems: readonly CarryForwardCandidate[],
  existingTargetKeys: readonly string[] = [],
): CarryForwardAction {
  if (pendingItems.length === 0) return { kind: "NONE", items: [] };

  const seenIds = new Set<string>();
  const seenOrigins = new Set<string>();
  const seenTargets = new Set(existingTargetKeys);
  for (const item of pendingItems) {
    if (seenIds.has(item.id) || seenOrigins.has(item.originGoalId)) {
      throw new Error("A carry-forward item cannot be added to the same week more than once.");
    }
    seenIds.add(item.id);
    seenOrigins.add(item.originGoalId);
    if (item.targetKey === null) continue;
    if (seenTargets.has(item.targetKey)) {
      throw new Error("A target cannot be carried into the same week more than once.");
    }
    seenTargets.add(item.targetKey);
  }

  if (pendingItems.length >= 4) {
    return { kind: "AUTO_ADD_AS_MAIN", items: pendingItems };
  }
  return { kind: "ASK_INDIVIDUALLY", items: pendingItems };
}

function parseDateOnly(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Expected a date in YYYY-MM-DD format.");
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || formatDateOnly(parsed) !== value) {
    throw new Error("Expected a valid calendar date.");
  }
  return parsed;
}

function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}
