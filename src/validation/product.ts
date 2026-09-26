import { z } from "zod";

const optionalText = z.string().trim().optional().transform((value) => value || null);
const optionalId = z.union([z.literal(""), z.uuid()]).optional().transform((value) => value || null);
const optionalDate = z.union([z.literal(""), z.iso.date()]).optional().transform((value) => value || null);
const rating = z.union([z.literal(""), z.coerce.number().int().min(1).max(5)]).optional().transform((value) => value === "" || value === undefined ? null : value);

export const timezoneSchema = z.string().trim().min(1).refine((value) => {
  try { new Intl.DateTimeFormat("en", { timeZone: value }); return true; } catch { return false; }
}, "Choose a valid IANA timezone.");

export const weeklyPeriodInputSchema = z.object({
  startOn: z.iso.date("Enter a valid start date."),
  timezoneName: timezoneSchema,
});

export const weeklyGoalInputSchema = z.object({
  weeklyPeriodId: z.uuid(),
  kind: z.enum(["MAIN", "EXTRA"]),
  title: z.string().trim().min(1, "Enter a goal title."),
  notes: optionalText,
  targetType: z.enum(["", "learningItemId", "lessonId", "topicId", "songId", "songSectionId", "personalGoalId", "reviewEntryId"]).optional().default(""),
  targetId: optionalId,
}).refine((input) => (input.targetType === "") === (input.targetId === null), {
  message: "Choose both a target type and target, or leave both empty.", path: ["targetId"],
});

export const weeklyGoalDetailsSchema = weeklyGoalInputSchema.extend({ goalId: z.uuid() });

export const weeklyGoalStatusInputSchema = z.object({
  goalId: z.uuid(),
  status: z.enum(["NOT_TOUCHED", "PARTIALLY_COMPLETED", "COMPLETED"]),
  startedOn: optionalDate,
  completedOn: optionalDate,
  rating,
  notes: optionalText,
}).refine((input) => !input.startedOn || !input.completedOn || input.completedOn >= input.startedOn, {
  message: "Completion date must be on or after the start date.", path: ["completedOn"],
});

export const carryForwardDecisionSchema = z.object({
  carryForwardId: z.uuid(),
  weeklyPeriodId: z.uuid(),
  decision: z.enum(["ADD", "LATER"]),
});

export const personalGoalInputSchema = z.object({
  kind: z.enum(["LONG_TERM", "PRACTICE"]),
  title: z.string().trim().min(1, "Enter a goal title."),
  notes: optionalText,
  status: z.enum(["ACTIVE", "COMPLETED", "PAUSED", "CANCELLED"]).default("ACTIVE"),
  startsOn: optionalDate,
  targetOn: optionalDate,
  completedOn: optionalDate,
  targetMinutes: z.union([z.literal(""), z.coerce.number().int().positive()]).optional().transform((value) => value === "" || value === undefined ? null : value),
  targetPracticeDays: z.union([z.literal(""), z.coerce.number().int().positive()]).optional().transform((value) => value === "" || value === undefined ? null : value),
  targetPeriod: z.enum(["", "WEEK", "MONTH", "YEAR", "ALL_TIME"]).optional().default(""),
  rating,
}).superRefine((input, context) => {
  if (input.startsOn && input.targetOn && input.targetOn < input.startsOn) context.addIssue({ code: "custom", message: "Target date must be on or after the start date.", path: ["targetOn"] });
  if (input.startsOn && input.completedOn && input.completedOn < input.startsOn) context.addIssue({ code: "custom", message: "Completion date must be on or after the start date.", path: ["completedOn"] });
  if (input.kind === "PRACTICE" && (!input.targetMinutes && !input.targetPracticeDays || !input.targetPeriod)) {
    context.addIssue({ code: "custom", message: "Practice goals need a positive time or practice-day target and a target period.", path: ["targetPeriod"] });
  }
  if (input.kind === "LONG_TERM" && (input.targetMinutes || input.targetPracticeDays || input.targetPeriod)) {
    context.addIssue({ code: "custom", message: "Long-term goals do not use practice targets.", path: ["targetPeriod"] });
  }
});

export const practiceRecordInputSchema = z.object({
  practicedOn: z.iso.date("Enter a valid practice date."),
  durationMinutes: z.coerce.number().int().positive("Duration must be a positive number of minutes."),
  categoryId: optionalId,
  learningItemId: optionalId,
  lessonId: optionalId,
  topicId: optionalId,
  songId: optionalId,
  songSectionId: optionalId,
  weeklyGoalIds: z.array(z.uuid()).default([]),
  rating,
  notes: optionalText,
  recordingReference: optionalText,
});

export const songInputSchema = z.object({
  categoryId: optionalId,
  title: z.string().trim().min(1, "Enter a song title."),
  composer: optionalText,
  difficulty: rating,
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED"]),
  addedOn: z.iso.date(),
  startedOn: optionalDate,
  completedOn: optionalDate,
  rating,
  notes: optionalText,
}).refine((input) => {
  if (input.startedOn && input.startedOn < input.addedOn) return false;
  if (input.completedOn && (input.completedOn < input.addedOn || input.startedOn && input.completedOn < input.startedOn)) return false;
  return true;
}, { message: "Song dates must be on or after the added date and in order.", path: ["completedOn"] });

export const songSectionInputSchema = z.object({
  songId: z.uuid(),
  title: z.string().trim().min(1, "Enter a section title."),
  sortOrder: z.coerce.number().int().min(0, "Order must be zero or greater."),
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED"]),
  startedOn: optionalDate,
  completedOn: optionalDate,
  rating,
  notes: optionalText,
}).refine((input) => !input.startedOn || !input.completedOn || input.completedOn >= input.startedOn, {
  message: "Completion date must be on or after the start date.", path: ["completedOn"],
});

export const reviewInputSchema = z.object({
  reviewCycleId: z.uuid(),
  startsOn: z.iso.date(),
  endsOn: z.iso.date(),
  durationMinutes: z.union([z.literal(""), z.coerce.number().int().positive()]).optional().transform((value) => value === "" || value === undefined ? null : value),
  status: z.enum(["IN_PROGRESS", "COMPLETED"]),
  rating,
  notes: optionalText,
}).refine((input) => {
  const start = new Date(`${input.startsOn}T00:00:00Z`);
  const end = new Date(`${input.endsOn}T00:00:00Z`);
  return (end.getTime() - start.getTime()) / 86_400_000 <= 1 && end >= start;
}, { message: "A review period must last one or two calendar days.", path: ["endsOn"] });

export const reviewEntryInputSchema = z.object({
  reviewId: z.uuid(),
  kind: z.enum(["TOPIC", "TASK"]),
  title: z.string().trim().min(1, "Enter an entry title."),
  topicId: optionalId,
  result: optionalText,
  rating,
  sortOrder: z.coerce.number().int().min(0),
});

export const milestoneInputSchema = z.object({
  title: z.string().trim().min(1, "Enter a milestone title."),
  description: optionalText,
  happenedOn: z.iso.date(),
  categoryId: optionalId,
});

export const achievementDefinitionInputSchema = z.object({
  key: z.string().trim().regex(/^[a-z0-9][a-z0-9_-]*$/, "Use lowercase letters, numbers, underscores, or hyphens for the key."),
  name: z.string().trim().min(1, "Enter an achievement name."),
  description: optionalText,
  evaluatorKey: z.enum(["count_practices", "completed_lessons", "completed_songs", "completed_weeks", "practice_minutes", "completed_reviews", "login_streak"]),
  threshold: z.coerce.number().int().positive("Threshold must be a positive number."),
  isActive: z.enum(["true", "false"]).transform((value) => value === "true"),
});

export type WeeklyGoalInput = z.infer<typeof weeklyGoalInputSchema>;
export type PracticeRecordInput = z.infer<typeof practiceRecordInputSchema>;
export type SongInput = z.infer<typeof songInputSchema>;
