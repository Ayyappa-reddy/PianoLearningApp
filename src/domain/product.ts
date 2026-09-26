import { endDateExclusive } from "@/domain/planning";

export function assertNextPeriodStart(previousStart: string | null, nextStart: string): void {
  if (previousStart && nextStart < endDateExclusive(previousStart)) {
    throw new Error(`The next planning period must start on or after ${endDateExclusive(previousStart)}.`);
  }
}

export function parseDateOnly(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Enter a date in YYYY-MM-DD format.");
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error("Enter a valid calendar date.");
  return date;
}

export function nextDateOnly(value: string, days = 1): string {
  const date = parseDateOnly(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function getMondayStart(value: string): string {
  const date = parseDateOnly(value);
  const weekDayFromMonday = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - weekDayFromMonday);
  return date.toISOString().slice(0, 10);
}

export function isReviewDurationValid(startsOn: string, endsOn: string): boolean {
  return endsOn >= startsOn && endsOn <= nextDateOnly(startsOn);
}

export function countPracticeDays(records: readonly { practicedOn: string }[]): number {
  return new Set(records.map(({ practicedOn }) => practicedOn)).size;
}

export function targetRelation(type: string, id: string | null): Record<string, string | null> {
  const supported = ["learningItemId", "lessonId", "topicId", "songId", "songSectionId", "personalGoalId", "reviewEntryId"];
  if (!supported.includes(type)) {
    if (id === null) return {};
    throw new Error("Choose a supported goal target.");
  }
  return Object.fromEntries(supported.map((key) => [key, key === type ? id : null]));
}
