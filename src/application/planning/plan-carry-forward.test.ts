import { describe, expect, it } from "vitest";
import { validateWeeklyPeriodInput } from "@/application/planning/plan-carry-forward";

describe("weekly period input boundary", () => {
  it("accepts a valid local date and IANA timezone", () => {
    expect(validateWeeklyPeriodInput({
      sequenceNo: 1,
      startOn: "2026-09-25",
      timezoneName: "Europe/Berlin",
    }).sequenceNo).toBe(1);
  });

  it("rejects an invalid calendar date or timezone", () => {
    expect(() => validateWeeklyPeriodInput({
      sequenceNo: 1,
      startOn: "2026-02-30",
      timezoneName: "Europe/Berlin",
    })).toThrow();
    expect(() => validateWeeklyPeriodInput({
      sequenceNo: 1,
      startOn: "2026-09-25",
      timezoneName: "not-a-timezone",
    })).toThrow("Timezone must be a valid IANA timezone name.");
  });
});
