export interface StreakSummary {
  currentStreak: number;
  longestStreak: number;
}

export function localCalendarDateAt(instant: Date, timezoneName: string): string {
  if (Number.isNaN(instant.getTime())) throw new Error("Expected a valid instant.");

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezoneName,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function calculateStreakAt(
  loginDates: readonly string[],
  now: Date,
  timezoneName: string,
): StreakSummary {
  return calculateStreak(loginDates, localCalendarDateAt(now, timezoneName));
}

/**
 * Login dates and `today` must already be calendar dates in the owner's
 * configured timezone. This function intentionally performs no UTC/local
 * timezone conversion itself.
 */
export function calculateStreak(
  loginDates: readonly string[],
  today: string,
): StreakSummary {
  const dates = [...new Set(loginDates)].sort();
  if (dates.length === 0) return { currentStreak: 0, longestStreak: 0 };

  const runs: Array<{ first: string; last: string }> = [];
  let run = { first: dates[0], last: dates[0] };

  for (const date of dates.slice(1)) {
    if (differenceInDays(run.last, date) <= 2) {
      run.last = date;
    } else {
      runs.push(run);
      run = { first: date, last: date };
    }
  }
  runs.push(run);

  const longestStreak = Math.max(
    ...runs.map(({ first, last }) => differenceInDays(first, last) + 1),
  );
  const latestRun = runs[runs.length - 1];
  const ageOfLatestLogin = differenceInDays(latestRun.last, today);
  const currentStreak = ageOfLatestLogin >= 0 && ageOfLatestLogin <= 2
    ? differenceInDays(latestRun.first, today) + 1
    : 0;

  return { currentStreak, longestStreak };
}

function differenceInDays(from: string, to: string): number {
  return (toDate(to).getTime() - toDate(from).getTime()) / 86_400_000;
}

function toDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Expected a date in YYYY-MM-DD format.");
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error("Expected a valid calendar date.");
  }
  return parsed;
}
