"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { CatalogError } from "@/application/catalog/catalog-errors";
import { getCatalogService } from "@/infrastructure/catalog/catalog";
import { categoryInputSchema, learningItemInputSchema, lessonInputSchema, prerequisiteInputSchema, topicInputSchema } from "@/validation/catalog";

const idSchema = (value: FormDataEntryValue | null) => typeof value === "string" && z.uuid().safeParse(value).success ? value : null;
const dataFrom = (form: FormData) => Object.fromEntries(form.entries());
function to(path: string, code?: string, message?: string): never {
  if (!code) redirect(path);
  const query = new URLSearchParams({ error: code });
  if (message) query.set("message", message);
  redirect(path + "?" + query.toString());
}
function success(path: string, message: string): never {
  redirect(path + "?" + new URLSearchParams({ success: message }).toString());
}
function validationFailure(path: string, error: { issues: Array<{ message: string }> }): never {
  to(path, "validation", error.issues[0]?.message ?? "The submitted values are invalid.");
}
function actionFailure(path: string, error: unknown): never {
  if (error instanceof CatalogError) to(path, error.code.toLowerCase(), error.message);
  to(path, "unexpected");
}
async function mutate<T>(operation: () => Promise<T>, path: string): Promise<T> {
  try { return await operation(); }
  catch (error) { actionFailure(path, error); }
}

export async function createCategoryAction(form: FormData) {
  const parsed = categoryInputSchema.safeParse(dataFrom(form));
  if (!parsed.success) validationFailure("/learn", parsed.error);
  await mutate(() => getCatalogService().createCategory(parsed.data), "/learn");
  revalidatePath("/learn"); revalidatePath("/catalog");
  success("/learn", "Category created.");
}
export async function updateCategoryAction(form: FormData) {
  const id = idSchema(form.get("id"));
  const parsed = categoryInputSchema.safeParse(dataFrom(form));
  if (!id) to("/learn", "invalid_reference", "The category ID is invalid.");
  const path = "/catalog/categories/" + id;
  if (!parsed.success) validationFailure(path, parsed.error);
  await mutate(() => getCatalogService().updateCategory(id, parsed.data), path);
  revalidatePath("/learn"); revalidatePath(path);
  success(path, "Category saved.");
}
export async function deleteCategoryAction(form: FormData) {
  const id = idSchema(form.get("id"));
  if (!id) to("/learn", "invalid_reference", "The category ID is invalid.");
  const outcome = await mutate(() => getCatalogService().deleteCategory(id), "/learn");
  revalidatePath("/learn"); revalidatePath("/learn/archived"); revalidatePath("/catalog");
  success("/learn", outcome === "archived" ? "Category archived and kept for history." : "Category deleted.");
}
export async function createItemAction(form: FormData) {
  const parsed = learningItemInputSchema.safeParse(dataFrom(form));
  const categoryId = typeof form.get("categoryId") === "string" ? String(form.get("categoryId")) : "";
  const path = idSchema(categoryId) ? "/catalog/categories/" + categoryId : "/create";
  if (!parsed.success) validationFailure(path, parsed.error);
  const id = await mutate(() => getCatalogService().createItem(parsed.data), path);
  revalidatePath("/learn"); revalidatePath("/catalog");
  success("/catalog/items/" + id, "Main topic created.");
}
export async function updateItemAction(form: FormData) {
  const id = idSchema(form.get("id"));
  const parsed = learningItemInputSchema.safeParse(dataFrom(form));
  if (!id) to("/learn", "invalid_reference", "The main topic ID is invalid.");
  const path = "/catalog/items/" + id;
  if (!parsed.success) validationFailure(path, parsed.error);
  await mutate(() => getCatalogService().updateItem(id, parsed.data), path);
  revalidatePath("/learn"); revalidatePath(path);
  success(path, "Main topic saved.");
}
export async function deleteItemAction(form: FormData) {
  const id = idSchema(form.get("id"));
  if (!id) to("/learn", "invalid_reference", "The main topic ID is invalid.");
  const outcome = await mutate(() => getCatalogService().deleteItem(id), "/learn");
  revalidatePath("/learn"); revalidatePath("/learn/archived"); revalidatePath("/catalog");
  success("/learn", outcome === "archived" ? "Main topic archived and kept for history." : "Main topic deleted.");
}
export async function createLessonAction(form: FormData) {
  const parsed = lessonInputSchema.safeParse(dataFrom(form));
  const itemId = idSchema(form.get("learningItemId"));
  const path = itemId ? "/catalog/items/" + itemId : "/learn";
  if (!itemId) to(path, "invalid_reference", "Choose an active main topic.");
  if (!parsed.success) validationFailure(path, parsed.error);
  await mutate(() => getCatalogService().createLesson(parsed.data), path);
  revalidatePath(path); revalidatePath("/learn");
  success(path, "Subtopic created.");
}
export async function updateLessonAction(form: FormData) {
  const id = idSchema(form.get("id"));
  const parsed = lessonInputSchema.safeParse(dataFrom(form));
  const itemId = idSchema(form.get("learningItemId"));
  const path = itemId ? "/catalog/items/" + itemId : "/learn";
  if (!id || !itemId) to(path, "invalid_reference", "The subtopic reference is invalid.");
  if (!parsed.success) validationFailure(path, parsed.error);
  await mutate(() => getCatalogService().updateLesson(id, parsed.data), path);
  revalidatePath(path); revalidatePath("/learn");
  success(path, "Subtopic saved.");
}
export async function deleteLessonAction(form: FormData) {
  const id = idSchema(form.get("id"));
  const itemId = idSchema(form.get("learningItemId"));
  const path = itemId ? "/catalog/items/" + itemId : "/learn";
  if (!id || !itemId) to(path, "invalid_reference", "The subtopic reference is invalid.");
  const outcome = await mutate(() => getCatalogService().deleteLesson(id), path);
  revalidatePath(path); revalidatePath("/learn"); revalidatePath("/learn/archived");
  success(path, outcome === "archived" ? "Subtopic archived and kept for history." : "Subtopic deleted.");
}
export async function createTopicAction(form: FormData) {
  const parsed = topicInputSchema.safeParse(dataFrom(form));
  const lessonId = idSchema(form.get("lessonId"));
  const path = lessonId ? "/catalog/lessons/" + lessonId : "/learn";
  if (!lessonId) to(path, "invalid_reference", "The subtopic reference is invalid.");
  if (!parsed.success) validationFailure(path, parsed.error);
  await mutate(() => getCatalogService().createTopic(parsed.data), path);
  revalidatePath(path); revalidatePath("/learn");
  success(path, "Topic created.");
}
export async function updateTopicAction(form: FormData) {
  const id = idSchema(form.get("id"));
  const parsed = topicInputSchema.safeParse(dataFrom(form));
  const lessonId = idSchema(form.get("lessonId"));
  const path = lessonId ? "/catalog/lessons/" + lessonId : "/learn";
  if (!id || !lessonId) to(path, "invalid_reference", "The topic reference is invalid.");
  if (!parsed.success) validationFailure(path, parsed.error);
  await mutate(() => getCatalogService().updateTopic(id, parsed.data), path);
  revalidatePath(path); revalidatePath("/learn");
  success(path, "Topic saved.");
}
export async function deleteTopicAction(form: FormData) {
  const id = idSchema(form.get("id"));
  const lessonId = idSchema(form.get("lessonId"));
  const path = lessonId ? "/catalog/lessons/" + lessonId : "/learn";
  if (!id || !lessonId) to(path, "invalid_reference", "The topic reference is invalid.");
  const outcome = await mutate(() => getCatalogService().deleteTopic(id), path);
  revalidatePath(path); revalidatePath("/learn"); revalidatePath("/learn/archived");
  success(path, outcome === "archived" ? "Topic archived and kept for history." : "Topic deleted.");
}
export async function addPrerequisiteAction(form: FormData) {
  const parsed = prerequisiteInputSchema.safeParse(dataFrom(form));
  const id = idSchema(form.get("learningItemId"));
  const path = id ? "/catalog/items/" + id : "/learn";
  if (!id) to(path, "invalid_reference", "The main topic reference is invalid.");
  if (!parsed.success) validationFailure(path, parsed.error);
  await mutate(() => getCatalogService().addPrerequisite(parsed.data.learningItemId, parsed.data.prerequisiteItemId), path);
  revalidatePath(path);
  success(path, "Informational prerequisite added.");
}
export async function removePrerequisiteAction(form: FormData) {
  const itemId = idSchema(form.get("learningItemId"));
  const prerequisiteItemId = idSchema(form.get("prerequisiteItemId"));
  const path = itemId ? "/catalog/items/" + itemId : "/learn";
  if (!itemId || !prerequisiteItemId) to(path, "invalid_reference", "The prerequisite reference is invalid.");
  await mutate(() => getCatalogService().removePrerequisite(itemId, prerequisiteItemId), path);
  revalidatePath(path);
  success(path, "Prerequisite removed.");
}
