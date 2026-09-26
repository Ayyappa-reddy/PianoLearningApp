import { describe, expect, it } from "vitest";
import { achievementIsEarned, csvCell, dailyPracticeSeries, monthlyPracticeSeries, sortTimeline, weeklyPracticeSeries, yearlyPracticeSeries, type AchievementMetrics } from "@/domain/analytics";

const emptyMetrics: AchievementMetrics = {
  count_practices: 1, completed_lessons: 0, completed_songs: 0,
  completed_weeks: 0, practice_minutes: 45, completed_reviews: 0, login_streak: 2,
};

describe("data-derived analytics rules", () => {
  it("evaluates configured achievement thresholds against source metrics", () => {
    expect(achievementIsEarned("practice_minutes", 45, emptyMetrics)).toBe(true);
    expect(achievementIsEarned("practice_minutes", 46, emptyMetrics)).toBe(false);
    expect(achievementIsEarned("login_streak", 0, emptyMetrics)).toBe(false);
  });

  it("sorts timeline by date descending and deterministically breaks ties", () => {
    expect(sortTimeline([
      { date: "2026-09-20", kind: "practice", title: "Practice", id: "b" },
      { date: "2026-09-22", kind: "milestone", title: "Piano", id: "a" },
      { date: "2026-09-20", kind: "lesson", title: "Lesson", id: "a" },
    ]).map((item) => item.id)).toEqual(["a", "a", "b"]);
  });

  it("escapes values for valid CSV cells", () => {
    expect(csvCell('Notes, "Late"')).toBe('"Notes, ""Late"""');
    expect(csvCell(null)).toBe("");
  });

  it("builds daily, weekly, and monthly practice chart series with empty periods", () => {
    const records = [
      { practicedOn: "2026-09-25", durationMinutes: 20 },
      { practicedOn: "2026-09-27", durationMinutes: 15 },
      { practicedOn: "2026-09-20", durationMinutes: 30 },
      { practicedOn: "2026-08-01", durationMinutes: 30 },
    ];
    expect(dailyPracticeSeries(records, "2026-09-27", 3)).toEqual([
      { period: "2026-09-25", minutes: 20 }, { period: "2026-09-26", minutes: 0 }, { period: "2026-09-27", minutes: 15 },
    ]);
    expect(weeklyPracticeSeries(records, "2026-09-27", 2)).toEqual([
      { period: "2026-09-14", minutes: 30 }, { period: "2026-09-21", minutes: 35 },
    ]);
    expect(monthlyPracticeSeries(records, "2026-09-27", 2)).toEqual([
      { period: "2026-08", minutes: 30 }, { period: "2026-09", minutes: 65 },
    ]);
    expect(yearlyPracticeSeries(records, "2026-09-27")).toEqual([{ period: "2026", minutes: 95 }]);
  });
});
