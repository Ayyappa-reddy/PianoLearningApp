import { z } from "zod";

export const weeklyPeriodInputSchema = z.object({
  sequenceNo: z.number().int().positive(),
  startOn: z.iso.date(),
  timezoneName: z.string().min(1),
});

export const weeklyGoalStatusSchema = z.enum([
  "NOT_TOUCHED",
  "PARTIALLY_COMPLETED",
  "COMPLETED",
]);

export type WeeklyPeriodInput = z.infer<typeof weeklyPeriodInputSchema>;
