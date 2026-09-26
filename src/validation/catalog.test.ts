import { describe, expect, it } from "vitest";
import {
  categoryInputSchema,
  learningItemInputSchema,
  prerequisiteInputSchema,
  topicInputSchema,
} from "@/validation/catalog";

describe("catalog input validation", () => {
  it("accepts learning item creation using exactly the fields exposed by the category form", () => {
    const result = learningItemInputSchema.safeParse({
      categoryId: "d9428888-122b-4b36-9c22-4e1a6f0f9e2a",
      title: "Read treble clef notes",
      description: "",
      status: "NOT_STARTED",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toMatchObject({
        categoryId: "d9428888-122b-4b36-9c22-4e1a6f0f9e2a",
        title: "Read treble clef notes",
        description: null,
        notes: null,
        status: "NOT_STARTED",
        startedOn: null,
        completedOn: null,
        timeTakenMinutes: null,
      });
    }
  });

  it("trims category and learning item titles and normalizes empty optional text", () => {
    expect(categoryInputSchema.parse({ name: "  Theory  ", description: "  " })).toEqual({ name: "Theory", description: null });
    const item = learningItemInputSchema.parse({
      categoryId: "d9428888-122b-4b36-9c22-4e1a6f0f9e2a", title: "  Scales  ",
      description: "", notes: "", status: "NOT_STARTED", startedOn: "", completedOn: "", timeTakenMinutes: "",
    });
    expect(item.title).toBe("Scales");
    expect(item.timeTakenMinutes).toBeNull();
  });

  it("rejects reversed progress dates and negative time", () => {
    const base = {
      categoryId: "d9428888-122b-4b36-9c22-4e1a6f0f9e2a", title: "Scales", description: "", notes: "",
      status: "COMPLETED", startedOn: "2026-09-23", completedOn: "2026-09-20", timeTakenMinutes: "0",
    };
    expect(learningItemInputSchema.safeParse(base).success).toBe(false);
    expect(learningItemInputSchema.safeParse({ ...base, startedOn: "", completedOn: "", timeTakenMinutes: "-1" }).success).toBe(false);
  });

  it("requires nonnegative topic order and non-self prerequisites", () => {
    const topic = {
      lessonId: "d9428888-122b-4b36-9c22-4e1a6f0f9e2a", title: "Intervals", description: "", notes: "",
      status: "NOT_STARTED", startedOn: "", completedOn: "", timeTakenMinutes: "", sortOrder: "-1",
    };
    expect(topicInputSchema.safeParse(topic).success).toBe(false);
    expect(prerequisiteInputSchema.safeParse({
      learningItemId: "d9428888-122b-4b36-9c22-4e1a6f0f9e2a",
      prerequisiteItemId: "d9428888-122b-4b36-9c22-4e1a6f0f9e2a",
    }).success).toBe(false);
  });
});
