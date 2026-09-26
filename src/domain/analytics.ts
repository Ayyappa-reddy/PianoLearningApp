export type AchievementEvaluatorKey =
  | "count_practices"
  | "completed_lessons"
  | "completed_songs"
  | "completed_weeks"
  | "practice_minutes"
  | "completed_reviews"
  | "login_streak";

export type AchievementMetrics = Record<AchievementEvaluatorKey, number>;

export function achievementIsEarned(
  evaluatorKey: AchievementEvaluatorKey,
  threshold: number,
  metrics: AchievementMetrics,
): boolean {
  if (!Number.isInteger(threshold) || threshold < 1) return false;
  return metrics[evaluatorKey] >= threshold;
}

export type DatedTimelineItem = { date: string; kind: string; title: string; id: string };

export function sortTimeline(items: readonly DatedTimelineItem[]): DatedTimelineItem[] {
  return [...items].sort((a, b) => b.date.localeCompare(a.date) || a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id));
}

export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = value instanceof Date ? value.toISOString() : typeof value === "object" ? JSON.stringify(value) : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export interface DatedPracticeMinutes { practicedOn: string; durationMinutes: number }
export interface PracticeBucket { period: string; minutes: number }

export function dailyPracticeSeries(records: readonly DatedPracticeMinutes[], today: string, days = 14): PracticeBucket[] {
  const end = parseDay(today);
  const totals = new Map<string, number>();
  for (const record of records) totals.set(record.practicedOn, (totals.get(record.practicedOn) ?? 0) + record.durationMinutes);
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(end); date.setUTCDate(end.getUTCDate() - (days - index - 1));
    const period = date.toISOString().slice(0, 10);
    return { period, minutes: totals.get(period) ?? 0 };
  });
}

export function weeklyPracticeSeries(records: readonly DatedPracticeMinutes[], today: string, weeks = 12): PracticeBucket[] {
  const end = parseDay(today);
  end.setUTCDate(end.getUTCDate() - ((end.getUTCDay() + 6) % 7));
  const starts = Array.from({ length: weeks }, (_, index) => {
    const start = new Date(end); start.setUTCDate(end.getUTCDate() - (weeks - index - 1) * 7);
    return start.toISOString().slice(0, 10);
  });
  const totals = new Map(starts.map((start) => [start, 0]));
  for (const record of records) {
    const date = parseDay(record.practicedOn);
    date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
    const period = date.toISOString().slice(0, 10);
    if (totals.has(period)) totals.set(period, (totals.get(period) ?? 0) + record.durationMinutes);
  }
  return starts.map((period) => ({ period, minutes: totals.get(period) ?? 0 }));
}

export function monthlyPracticeSeries(records: readonly DatedPracticeMinutes[], today: string, months = 12): PracticeBucket[] {
  const end = parseDay(today);
  const totals = new Map<string, number>();
  const periods = Array.from({ length: months }, (_, index) => {
    const date = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - (months - index - 1), 1));
    const period = date.toISOString().slice(0, 7);
    totals.set(period, 0);
    return period;
  });
  for (const record of records) {
    const period = record.practicedOn.slice(0, 7);
    if (totals.has(period)) totals.set(period, (totals.get(period) ?? 0) + record.durationMinutes);
  }
  return periods.map((period) => ({ period, minutes: totals.get(period) ?? 0 }));
}

export function yearlyPracticeSeries(records: readonly DatedPracticeMinutes[], today: string): PracticeBucket[] {
  const year = Number(parseDay(today).toISOString().slice(0, 4));
  const startYear = records.length ? Math.min(year, ...records.map((record) => Number(record.practicedOn.slice(0, 4)))) : year;
  const totals = new Map<string, number>();
  for (let current = startYear; current <= year; current++) totals.set(String(current), 0);
  for (const record of records) {
    const period = record.practicedOn.slice(0, 4);
    if (totals.has(period)) totals.set(period, (totals.get(period) ?? 0) + record.durationMinutes);
  }
  return [...totals].map(([period, minutes]) => ({ period, minutes }));
}

function parseDay(value: string): Date {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error("Expected a valid YYYY-MM-DD calendar date.");
  }
  return date;
}
