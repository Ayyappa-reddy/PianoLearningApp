import { describe, expect, it } from "vitest";
import { practiceRecordInputSchema, weeklyGoalInputSchema, weeklyPeriodInputSchema } from "@/validation/product";

describe("product workflow input validation", () => {
  it("requires a valid timezone and start date for a planning period", () => {
    expect(weeklyPeriodInputSchema.safeParse({ startOn: "2026-09-28", timezoneName: "Europe/Berlin" }).success).toBe(true);
    expect(weeklyPeriodInputSchema.safeParse({ startOn: "2026-02-30", timezoneName: "Europe/Berlin" }).success).toBe(false);
    expect(weeklyPeriodInputSchema.safeParse({ startOn: "2026-09-28", timezoneName: "UTCish" }).success).toBe(false);
  });

  it("rejects half-selected goal targets and accepts an unlinked personal goal", () => {
    const base = { weeklyPeriodId: "24278220-3d44-44ac-8dd9-3232ec530122", title: "Practice chords", kind: "MAIN" };
    expect(weeklyGoalInputSchema.safeParse(base).success).toBe(true);
    expect(weeklyGoalInputSchema.safeParse({ ...base, targetType: "topicId" }).success).toBe(false);
  });

  it("requires manually entered positive duration and validates optional references as UUIDs", () => {
    expect(practiceRecordInputSchema.safeParse({ practicedOn: "2026-09-26", durationMinutes: 25 }).success).toBe(true);
    expect(practiceRecordInputSchema.safeParse({ practicedOn: "2026-09-26", durationMinutes: 0 }).success).toBe(false);
    expect(practiceRecordInputSchema.safeParse({ practicedOn: "2026-09-26", durationMinutes: 25, topicId: "bad-id" }).success).toBe(false);
  });
});
