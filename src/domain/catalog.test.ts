import { describe, expect, it } from "vitest";
import { prerequisiteIsValid, validateProgressDates } from "@/domain/catalog";

describe("catalog domain rules", () => {
  it("allows completion without any prerequisite readiness check", () => {
    expect(validateProgressDates({
      status: "COMPLETED",
      startedOn: null,
      completedOn: null,
    })).toBe(true);
  });

  it("rejects a completion date before the manually recorded start date", () => {
    expect(validateProgressDates({
      status: "COMPLETED",
      startedOn: new Date("2026-09-20T00:00:00.000Z"),
      completedOn: new Date("2026-09-19T00:00:00.000Z"),
    })).toBe(false);
  });

  it("allows prerequisite cycles but rejects a self prerequisite", () => {
    expect(prerequisiteIsValid("item-a", "item-b")).toBe(true);
    expect(prerequisiteIsValid("item-a", "item-a")).toBe(false);
  });
});
