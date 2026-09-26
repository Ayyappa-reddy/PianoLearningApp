import { z } from "zod";
import { progressStatuses, validateProgressDates } from "@/domain/catalog";

const optionalText = z.string().trim().optional().transform((value) => value || null);
const optionalDate = z.union([z.literal(""), z.iso.date()]).optional().transform((value) => value || null);
const optionalMinutes = z.union([z.literal(""), z.coerce.number().int().min(0)]).optional().transform((value) => value === "" || value === undefined ? null : value);

const progressFields = {
  status: z.enum(progressStatuses),
  startedOn: optionalDate,
  completedOn: optionalDate,
  timeTakenMinutes: optionalMinutes,
};

function withValidProgressDates<T extends { startedOn: string | null; completedOn: string | null }>(schema: z.ZodType<T>) {
  return schema.refine((value) => validateProgressDates({
    status: "NOT_STARTED",
    startedOn: value.startedOn ? new Date(`${value.startedOn}T00:00:00.000Z`) : null,
    completedOn: value.completedOn ? new Date(`${value.completedOn}T00:00:00.000Z`) : null,
  }), { message: "Completion date must be on or after the start date.", path: ["completedOn"] });
}

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1, "Enter a category name."),
  description: optionalText,
});

export const learningItemInputSchema = withValidProgressDates(z.object({
  categoryId: z.uuid(),
  title: z.string().trim().min(1, "Enter a learning item title."),
  description: optionalText,
  notes: optionalText,
  ...progressFields,
}));

export const lessonInputSchema = withValidProgressDates(z.object({
  learningItemId: z.uuid(),
  title: z.string().trim().min(1, "Enter a lesson title."),
  description: optionalText,
  notes: optionalText,
  ...progressFields,
}));

export const topicInputSchema = withValidProgressDates(z.object({
  lessonId: z.uuid(),
  title: z.string().trim().min(1, "Enter a topic title."),
  description: optionalText,
  notes: optionalText,
  sortOrder: z.coerce.number().int().min(0, "Order must be zero or greater."),
  ...progressFields,
}));

export const prerequisiteInputSchema = z.object({
  learningItemId: z.uuid(),
  prerequisiteItemId: z.uuid(),
}).refine((value) => value.learningItemId !== value.prerequisiteItemId, {
  message: "An item cannot be its own prerequisite.",
  path: ["prerequisiteItemId"],
});

export type CategoryInput = z.infer<typeof categoryInputSchema>;
export type LearningItemInput = z.infer<typeof learningItemInputSchema>;
export type LessonInput = z.infer<typeof lessonInputSchema>;
export type TopicInput = z.infer<typeof topicInputSchema>;
