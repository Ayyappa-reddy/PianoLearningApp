import { describe, expect, it } from "vitest";
import { assertNextPeriodStart, getMondayStart, isReviewDurationValid } from "@/domain/product";
import { isReviewCycleEligible, isWeeklyPeriodGoalsCompleted, planCarryForward } from "@/domain/planning";

describe("planning and review rules", () => {
  it("requires a seven-day gap and accepts the first period without an anchor", () => {
    expect(() => assertNextPeriodStart(null, "2026-09-28")).not.toThrow();
    expect(() => assertNextPeriodStart("2026-09-28", "2026-10-04")).toThrow("on or after 2026-10-05");
    expect(() => assertNextPeriodStart("2026-09-28", "2026-10-05")).not.toThrow();
  });

  it("counts only completed Main goals, requiring at least one", () => {
    expect(isWeeklyPeriodGoalsCompleted([])).toBe(false);
    expect(isWeeklyPeriodGoalsCompleted([{ id: "1", kind: "MAIN", status: "COMPLETED" }, { id: "2", kind: "EXTRA", status: "NOT_TOUCHED" }])).toBe(true);
    expect(isWeeklyPeriodGoalsCompleted([{ id: "1", kind: "MAIN", status: "COMPLETED" }, { id: "2", kind: "MAIN", status: "PARTIALLY_COMPLETED" }])).toBe(false);
  });

  it("offers a cycle only for three consecutive completed periods", () => {
    const three = [1, 2, 3].map((sequenceNo) => ({ sequenceNo, goals: [{ id: String(sequenceNo), kind: "MAIN" as const, status: "COMPLETED" as const }] }));
    expect(isReviewCycleEligible(three)).toBe(true);
    expect(isReviewCycleEligible([{ ...three[0] }, { ...three[1] }, { ...three[2], sequenceNo: 4 }])).toBe(false);
    expect(isReviewCycleEligible([{ ...three[0] }, { ...three[1] }, { sequenceNo: 3, goals: [] }])).toBe(false);
  });

  it("offers 1–3 pending items for a decision and auto-adds at 4 without duplicate targets", () => {
    const item = (id: number) => ({ id: `c${id}`, title: `goal ${id}`, originGoalId: `g${id}`, targetKey: `topic:t${id}` });
    expect(planCarryForward([item(1), item(2), item(3)]).kind).toBe("ASK_INDIVIDUALLY");
    expect(planCarryForward([item(1), item(2), item(3), item(4)]).kind).toBe("AUTO_ADD_AS_MAIN");
    expect(() => planCarryForward([item(1), { ...item(2), targetKey: "topic:t1" }])).toThrow("more than once");
  });

  it("allows review periods lasting one or two days only", () => {
    expect(isReviewDurationValid("2026-10-01", "2026-10-01")).toBe(true);
    expect(isReviewDurationValid("2026-10-01", "2026-10-02")).toBe(true);
    expect(isReviewDurationValid("2026-10-01", "2026-10-03")).toBe(false);
  });

  it("provides the Monday of the given calendar week", () => {
    expect(getMondayStart("2026-09-27")).toBe("2026-09-21");
  });
});
