import { describe, expect, it } from "vitest";
import {
  endDateExclusive,
  isReviewCycleEligible,
  isWeeklyPeriodGoalsCompleted,
  planCarryForward,
  type CarryForwardCandidate,
  type WeeklyGoalSnapshot,
} from "@/domain/planning";

const completedMain: WeeklyGoalSnapshot = {
  id: "goal-main",
  kind: "MAIN",
  status: "COMPLETED",
};

function candidate(id: string, targetKey = id): CarryForwardCandidate {
  return { id, title: id, originGoalId: `origin-${id}`, targetKey };
}

describe("weekly planning rules", () => {
  it("defines a period as exactly seven local calendar dates", () => {
    expect(endDateExclusive("2026-09-25")).toBe("2026-10-02");
  });

  it("requires at least one completed Main goal; Extra goals do not block completion", () => {
    expect(isWeeklyPeriodGoalsCompleted([])).toBe(false);
    expect(isWeeklyPeriodGoalsCompleted([
      completedMain,
      { id: "extra", kind: "EXTRA", status: "NOT_TOUCHED" },
    ])).toBe(true);
    expect(isWeeklyPeriodGoalsCompleted([
      completedMain,
      { id: "main-2", kind: "MAIN", status: "PARTIALLY_COMPLETED" },
    ])).toBe(false);
  });

  it("offers individual decisions for up to three pending items", () => {
    expect(planCarryForward([candidate("a"), candidate("b"), candidate("c")]).kind)
      .toBe("ASK_INDIVIDUALLY");
  });

  it("automatically adds four or more pending items as Main goals", () => {
    expect(planCarryForward(["a", "b", "c", "d"].map((id) => candidate(id))).kind)
      .toBe("AUTO_ADD_AS_MAIN");
  });

  it("rejects duplicate linked targets in one new week", () => {
    expect(() => planCarryForward([candidate("a", "topic:1"), candidate("b", "topic:1")]))
      .toThrow("A target cannot be carried into the same week more than once.");
  });

  it("makes a review eligible only for three consecutive fully completed periods", () => {
    const periods = [1, 2, 3].map((sequenceNo) => ({ sequenceNo, goals: [completedMain] }));
    expect(isReviewCycleEligible(periods)).toBe(true);
    expect(isReviewCycleEligible(periods.map((period, index) => ({
      ...period,
      goals: index === 2 ? [{ ...completedMain, status: "PARTIALLY_COMPLETED" as const }] : period.goals,
    })))).toBe(false);
    expect(isReviewCycleEligible([
      periods[0],
      periods[1],
      { ...periods[2], sequenceNo: 4 },
    ]))
      .toBe(false);
  });
});
