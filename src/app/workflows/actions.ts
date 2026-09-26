"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError, type ZodType, z } from "zod";
import { getPrismaClient } from "@/infrastructure/database/prisma";
import * as planning from "@/infrastructure/product/planning-repository";
import * as activity from "@/infrastructure/product/activity-repository";
import * as reviews from "@/infrastructure/product/review-repository";
import * as progress from "@/infrastructure/product/progress-repository";
import { updateOwnerTimezone } from "@/infrastructure/product/profile-repository";
import { ProductError } from "@/application/product/errors";
import {
  weeklyPeriodInputSchema, weeklyGoalInputSchema, weeklyGoalDetailsSchema, weeklyGoalStatusInputSchema,
  carryForwardDecisionSchema, personalGoalInputSchema, practiceRecordInputSchema, songInputSchema,
  songSectionInputSchema, reviewInputSchema, reviewEntryInputSchema, milestoneInputSchema,
  achievementDefinitionInputSchema, timezoneSchema,
} from "@/validation/product";

const db = getPrismaClient();
function fields(form: FormData) {
  const value: Record<string, unknown> = Object.fromEntries(form.entries());
  for (const key of ["weeklyGoalIds"]) value[key] = form.getAll(key);
  return value;
}
function fail(path: string, error: unknown): never {
  const message = error instanceof ZodError
    ? error.issues[0]?.message
    : error instanceof ProductError
      ? error.message
      : error instanceof Error && error.constructor === Error
        ? error.message
        : "The change could not be saved. Please try again.";
  redirect(`${path}?error=${encodeURIComponent(message || "The change could not be saved.")}`);
}
async function run<T>(schema: ZodType<T>, form: FormData, path: string, operation: (value: T) => Promise<unknown>, redirectTo = path, message = "Saved.") {
  try { const value = schema.parse(fields(form)); await operation(value); }
  catch (error) { fail(path, error); }
  revalidatePath(path); revalidatePath(redirectTo);
  redirect(redirectTo + "?success=" + encodeURIComponent(message));
}

export async function createPeriodAction(form: FormData) { await run(weeklyPeriodInputSchema, form, "/create/weekly-plan", async (v) => planning.createWeeklyPeriod(db, v.startOn), "/this-week", "Seven-day plan created."); }
export async function createGoalAction(form: FormData) {
  const value = fields(form);
  const target = typeof value.target === "string" ? value.target : "";
  const split = target.indexOf(":");
  value.targetType = split > 0 ? target.slice(0, split) : "";
  value.targetId = split > 0 ? target.slice(split + 1) : "";
  try { await planning.createWeeklyGoal(db, weeklyGoalInputSchema.parse(value)); }
  catch (error) { fail("/this-week", error); }
  revalidatePath("/planning"); revalidatePath("/this-week"); redirect("/this-week?success=Goal%20added.");
}
export async function editGoalAction(form: FormData) { await run(weeklyGoalDetailsSchema, form, "/planning", async (v) => planning.updateWeeklyGoalDetails(db, v.goalId, v)); }
export async function updateGoalStatusAction(form: FormData) { await run(weeklyGoalStatusInputSchema, form, "/this-week", (v) => planning.updateWeeklyGoal(db, v), "/this-week", "Goal status saved."); }
export async function deferGoalAction(form: FormData) {
  const id = String(form.get("goalId") ?? ""); const week = String(form.get("weeklyPeriodId") ?? "");
  try { await planning.deferWeeklyGoal(db, id, week); } catch (error) { fail("/this-week", error); }
  revalidatePath("/planning"); revalidatePath("/this-week"); redirect("/this-week?success=Marked%20for%20Learn%20Later.&undoGoal=" + encodeURIComponent(id));
}
export async function undoDeferGoalAction(form: FormData) {
  const id = String(form.get("goalId") ?? "");
  const week = String(form.get("weeklyPeriodId") ?? "");
  try {
    if (!z.uuid().safeParse(id).success || !z.uuid().safeParse(week).success) throw new Error("The Learn Later reference is invalid.");
    await planning.undoDeferredWeeklyGoal(db, id, week);
  } catch (error) { fail("/this-week", error); }
  revalidatePath("/this-week"); revalidatePath("/planning");
  redirect("/this-week?success=Learn%20Later%20undone.%20The%20original%20week%20is%20unchanged.");
}
export async function decideCarryAction(form: FormData) { const decision = form.get("decision") === "LATER"; await run(carryForwardDecisionSchema, form, "/this-week", (v) => planning.decideCarryForward(db, v.carryForwardId, v.weeklyPeriodId, v.decision), "/this-week", decision ? "Left for a future week." : "Added to this week."); }
export async function createPersonalGoalAction(form: FormData) { await run(personalGoalInputSchema, form, "/create/personal-goal", (v) => planning.createPersonalGoal(db, v), "/create/personal-goal", "Personal goal created."); }
export async function updatePersonalGoalAction(form: FormData) {
  const id = String(form.get("id") ?? "");
  try { const data = personalGoalInputSchema.parse(fields(form)); await planning.updatePersonalGoal(db, id, data); }
  catch (error) { fail("/planning", error); }
  revalidatePath("/planning"); redirect("/planning?success=Changes%20saved.");
}
export async function updateGoalDetailsAction(form: FormData) {
  const value = fields(form);
  const target = typeof value.target === "string" ? value.target : "";
  const split = target.indexOf(":");
  value.targetType = split > 0 ? target.slice(0, split) : "";
  value.targetId = split > 0 ? target.slice(split + 1) : "";
  try { const data = weeklyGoalDetailsSchema.parse(value); await planning.updateWeeklyGoalDetails(db, data.goalId, data); }
  catch (error) { fail("/planning", error); }
  revalidatePath("/planning"); redirect("/planning?success=Changes%20saved.");
}
export async function archivePersonalGoalAction(form: FormData) {
  try { await planning.archivePersonalGoal(db, String(form.get("id") ?? "")); } catch (error) { fail("/planning", error); }
  revalidatePath("/planning"); redirect("/planning?success=Changes%20saved.");
}
export async function createPracticeAction(form: FormData) { await run(practiceRecordInputSchema, form, "/practice", (v) => activity.createPracticeRecord(db, v), "/practice", "Practice record saved."); }
export async function deletePracticeAction(form: FormData) {
  try { await activity.deletePracticeRecord(db, String(form.get("id") ?? "")); } catch (error) { fail("/practice", error); }
  revalidatePath("/practice"); redirect("/practice?success=Changes%20saved.");
}
export async function updatePracticeAction(form: FormData) {
  const id = String(form.get("id") ?? "");
  try { const data = practiceRecordInputSchema.parse(fields(form)); await activity.updatePracticeRecord(db, id, data); }
  catch (error) { fail("/practice", error); }
  revalidatePath("/practice"); redirect("/practice?success=Changes%20saved.");
}
export async function createSongAction(form: FormData) { await run(songInputSchema, form, "/create/song", (v) => activity.createSong(db, v), "/songs", "Song added."); }
export async function createSectionAction(form: FormData) { await run(songSectionInputSchema, form, "/songs", (v) => activity.createSongSection(db, v), "/songs", "Song section added."); }
export async function updateSongAction(form: FormData) {
  const id = String(form.get("id") ?? "");
  try { const data = songInputSchema.parse(fields(form)); await activity.updateSong(db, id, data); }
  catch (error) { fail("/songs", error); }
  revalidatePath("/songs"); redirect("/songs?success=Changes%20saved.");
}
export async function updateSectionAction(form: FormData) {
  const id = String(form.get("id") ?? "");
  try { const data = songSectionInputSchema.parse(fields(form)); await activity.updateSongSection(db, id, data); }
  catch (error) { fail("/songs", error); }
  revalidatePath("/songs"); redirect("/songs?success=Changes%20saved.");
}
export async function deleteSongAction(form: FormData) {
  try { await activity.archiveOrDeleteSong(db, String(form.get("id") ?? "")); } catch (error) { fail("/songs", error); }
  revalidatePath("/songs"); redirect("/songs?success=Changes%20saved.");
}
export async function deleteSectionAction(form: FormData) {
  try { await activity.archiveOrDeleteSongSection(db, String(form.get("id") ?? "")); } catch (error) { fail("/songs", error); }
  revalidatePath("/songs"); redirect("/songs?success=Changes%20saved.");
}
export async function createReviewAction(form: FormData) { await run(reviewInputSchema, form, "/reviews", (v) => reviews.createReview(db, v)); }
export async function updateReviewAction(form: FormData) {
  const id = String(form.get("id") ?? "");
  try { const data = reviewInputSchema.parse(fields(form)); await reviews.updateReview(db, id, data); }
  catch (error) { fail("/reviews", error); }
  revalidatePath("/reviews"); redirect("/reviews?success=Changes%20saved.");
}
export async function decideReviewAction(form: FormData) {
  const id = String(form.get("id") ?? ""); const decision = String(form.get("decision") ?? "");
  try { if (decision !== "ACCEPTED" && decision !== "SKIPPED") throw new Error("Choose accept or skip."); await reviews.decideReviewCycle(db, id, decision); } catch (error) { fail("/reviews", error); }
  revalidatePath("/reviews"); revalidatePath("/planning"); redirect("/reviews?success=Changes%20saved.");
}
export async function createReviewEntryAction(form: FormData) { await run(reviewEntryInputSchema, form, "/reviews", (v) => reviews.createReviewEntry(db, v)); }
export async function updateReviewEntryAction(form: FormData) {
  const id = String(form.get("id") ?? "");
  try { const data = reviewEntryInputSchema.parse(fields(form)); await reviews.updateReviewEntry(db, id, data); }
  catch (error) { fail("/reviews", error); }
  revalidatePath("/reviews"); redirect("/reviews?success=Changes%20saved.");
}
export async function deleteReviewEntryAction(form: FormData) {
  try { await reviews.deleteReviewEntry(db, String(form.get("id") ?? "")); } catch (error) { fail("/reviews", error); }
  revalidatePath("/reviews"); redirect("/reviews?success=Changes%20saved.");
}
export async function createMilestoneAction(form: FormData) { await run(milestoneInputSchema, form, (form.get("returnTo") as string) || "/progress", (v) => progress.createMilestone(db, v)); }
export async function updateMilestoneAction(form: FormData) {
  const id = String(form.get("id") ?? "");
  try { const data = milestoneInputSchema.parse(fields(form)); await progress.updateMilestone(db, id, data); }
  catch (error) { fail("/progress", error); }
  revalidatePath("/progress"); redirect("/progress?success=Changes%20saved.");
}
export async function deleteMilestoneAction(form: FormData) {
  try { await progress.deleteMilestone(db, String(form.get("id") ?? "")); } catch (error) { fail("/progress", error); }
  revalidatePath("/progress"); redirect("/progress?success=Changes%20saved.");
}
export async function createAchievementAction(form: FormData) { await run(achievementDefinitionInputSchema, form, "/progress", (v) => progress.createAchievementDefinition(db, v)); }
export async function updateTimezoneAction(form: FormData) {
  const path = "/settings";
  try { await updateOwnerTimezone(db, timezoneSchema.parse(form.get("timezoneName"))); } catch (error) { fail(path, error); }
  revalidatePath("/"); revalidatePath(path); redirect(path + "?success=Timezone%20saved.");
}
