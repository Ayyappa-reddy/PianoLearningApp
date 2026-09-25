import { describe, expect, it } from "vitest";
import { calculateStreak, calculateStreakAt, localCalendarDateAt } from "@/domain/streak";

describe("login-day streak", () => {
  it("allows one missed local calendar day and counts the grace day", () => {
    expect(calculateStreak(["2026-09-05", "2026-09-07"], "2026-09-07"))
      .toEqual({ currentStreak: 3, longestStreak: 3 });
  });

  it("starts a new run after two missed dates", () => {
    expect(calculateStreak(["2026-09-05", "2026-09-08"], "2026-09-08"))
      .toEqual({ currentStreak: 1, longestStreak: 1 });
  });

  it("keeps the latest run current through one missed day, then expires it", () => {
    const logins = ["2026-09-05", "2026-09-06"];
    expect(calculateStreak(logins, "2026-09-07").currentStreak).toBe(3);
    expect(calculateStreak(logins, "2026-09-09").currentStreak).toBe(0);
  });

  it("counts each local login date once", () => {
    expect(calculateStreak(["2026-09-05", "2026-09-05"], "2026-09-05"))
      .toEqual({ currentStreak: 1, longestStreak: 1 });
  });

  it("derives today's date using the configured timezone", () => {
    const instant = new Date("2026-09-25T23:30:00.000Z");
    expect(localCalendarDateAt(instant, "Europe/Berlin")).toBe("2026-09-26");
    expect(localCalendarDateAt(instant, "America/New_York")).toBe("2026-09-25");
    expect(calculateStreakAt(["2026-09-25"], instant, "Europe/Berlin").currentStreak).toBe(2);
  });
});
