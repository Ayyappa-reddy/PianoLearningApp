import Link from "next/link";
import type { CatalogCategory, CatalogItem, CatalogItemDetail, CatalogLesson, CatalogTopic } from "@/application/catalog/catalog-repository";
import {
  addPrerequisiteAction, createCategoryAction, createItemAction, createLessonAction, createTopicAction,
  deleteCategoryAction, deleteItemAction, deleteLessonAction, deleteTopicAction, removePrerequisiteAction,
  updateCategoryAction, updateItemAction, updateLessonAction, updateTopicAction,
} from "./actions";

const inputClass = "mt-1 block w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-stone-500 focus:ring-2 focus:ring-stone-200";
const labelClass = "block text-sm font-medium text-stone-700";
const buttonClass = "inline-flex min-h-10 items-center justify-center rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700";
const secondaryClass = "inline-flex min-h-10 items-center justify-center rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-100";
const dangerClass = "inline-flex min-h-10 items-center justify-center rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-50";

export function ErrorNotice({ code, message, success }: { code?: string; message?: string; success?: string }) {
  if (success) return <p role="status" className="rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-900">{success}</p>;
  if (!code) return null;
  const messages: Record<string, string> = {
    validation: "Please check the required fields and dates, then try again.",
    duplicate: "A record with that name or order already exists.",
    conflict: "This item is still referenced by learning or historical records, so it could not be changed.",
    invalid_reference: "The selected record is invalid or no longer available.",
    not_found: "That record could not be found.",
    unexpected: "The request could not be completed. Please try again.",
    archived: "The record was archived to preserve related history.",
    deleted: "The record was deleted.",
  };
  return <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{message ?? messages[code] ?? messages.unexpected}</p>;
}

export function CategoryCreateForm() {
  return <form action={createCategoryAction} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
    <label className={labelClass}>Category name<input name="name" required className={inputClass} /></label>
    <label className={labelClass}>Description<input name="description" className={inputClass} /></label>
    <button className={buttonClass}>Add category</button>
  </form>;
}

export function CategoryEditor({ category }: { category: CatalogCategory }) {
  return <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
    <form action={updateCategoryAction} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="id" value={category.id} />
      <label className={labelClass}>Name<input name="name" required defaultValue={category.name} className={inputClass} /></label>
      <label className={labelClass}>Description<input name="description" defaultValue={category.description ?? ""} className={inputClass} /></label>
      <button className={`${buttonClass} sm:col-span-2 justify-self-start`}>Save category</button>
    </form>
    <form action={deleteCategoryAction}>
      <input type="hidden" name="id" value={category.id} />
      <button className={dangerClass}>{category.archivedAt ? "Delete archived category" : "Delete / archive"}</button>
    </form>
  </div>;
}

export function ItemCreateForm({ categoryId }: { categoryId: string }) {
  return <form action={createItemAction} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
    <input type="hidden" name="categoryId" value={categoryId} />
    <input type="hidden" name="status" value="NOT_STARTED" />
    <label className={labelClass}>Main Topic title<input name="title" required className={inputClass} /></label>
    <label className={labelClass}>Description<input name="description" className={inputClass} /></label>
    <button className={buttonClass}>Add Main Topic</button>
  </form>;
}

export function ItemCard({ item }: { item: CatalogItem }) {
  return <Link href={`/catalog/items/${item.id}`} className="block rounded-xl border border-stone-200 bg-white p-4 hover:border-stone-400 hover:shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <span className="font-medium text-stone-900">{item.title}</span>
      <span className="text-xs text-stone-500">{item.archivedAt ? "Archived" : item.status.replaceAll("_", " ")}</span>
    </div>
    {item.description && <p className="mt-2 text-sm text-stone-600">{item.description}</p>}
  </Link>;
}

export function ItemEditor({ item, categories }: { item: CatalogItemDetail; categories: CatalogCategory[] }) {
  return <form action={updateItemAction} className="grid gap-4 sm:grid-cols-2">
    <input type="hidden" name="id" value={item.id} />
    <label className={labelClass}>Title<input name="title" required defaultValue={item.title} className={inputClass} /></label>
    <label className={labelClass}>Category<select name="categoryId" defaultValue={item.categoryId} className={inputClass}>
      {categories.filter((category) => !category.archivedAt || category.id === item.categoryId).map((category) => <option key={category.id} value={category.id}>{category.name}{category.archivedAt ? " (archived)" : ""}</option>)}
    </select></label>
    <label className={`${labelClass} sm:col-span-2`}>Description<textarea name="description" defaultValue={item.description ?? ""} rows={2} className={inputClass} /></label>
    <label className={labelClass}>Progress<select name="status" defaultValue={item.status} className={inputClass}>{statusOptions(item.status)}</select></label>
    <label className={labelClass}>Time taken (minutes)<input type="number" min="0" name="timeTakenMinutes" defaultValue={item.timeTakenMinutes ?? ""} className={inputClass} /></label>
    <label className={labelClass}>Started<input type="date" name="startedOn" defaultValue={dateField(item.startedOn)} className={inputClass} /></label>
    <label className={labelClass}>Completed<input type="date" name="completedOn" defaultValue={dateField(item.completedOn)} className={inputClass} /></label>
    <label className={`${labelClass} sm:col-span-2`}>Notes<textarea name="notes" defaultValue={item.notes ?? ""} rows={3} className={inputClass} /></label>
    <button className={`${buttonClass} justify-self-start`}>Save Main Topic</button>
  </form>;
}

export function ItemDeleteForm({ item }: { item: CatalogItem }) {
  return <form action={deleteItemAction}>
    <input type="hidden" name="id" value={item.id} />
    <button className={dangerClass}>{item.archivedAt ? "Delete archived item" : "Delete / archive item"}</button>
  </form>;
}

export function PrerequisiteForm({ item, candidates }: { item: CatalogItemDetail; candidates: Array<{ id: string; title: string; categoryName: string }> }) {
  return <>
    <form action={addPrerequisiteAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <input type="hidden" name="learningItemId" value={item.id} />
      <label className={`${labelClass} flex-1`}>Informative prerequisite<select name="prerequisiteItemId" required className={inputClass} defaultValue="">
        <option value="" disabled>Select an item</option>
        {candidates.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.title} · {candidate.categoryName}</option>)}
      </select></label>
      <button className={secondaryClass} disabled={!candidates.length}>Add prerequisite</button>
    </form>
    {item.prerequisites.length > 0 ? <ul className="mt-4 space-y-2">{item.prerequisites.map(({ prerequisiteItem }) => <li key={prerequisiteItem.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-stone-50 px-3 py-2 text-sm">
      <span>{prerequisiteItem.title}{prerequisiteItem.archivedAt ? " (archived)" : ""}</span>
      <form action={removePrerequisiteAction}><input type="hidden" name="learningItemId" value={item.id} /><input type="hidden" name="prerequisiteItemId" value={prerequisiteItem.id} /><button className="text-sm text-red-800 underline">Remove</button></form>
    </li>)}</ul> : <p className="mt-3 text-sm text-stone-500">No prerequisites recorded.</p>}
  </>;
}

export function LessonCreateForm({ learningItemId }: { learningItemId: string }) {
  return <form action={createLessonAction} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
    <input type="hidden" name="learningItemId" value={learningItemId} /><input type="hidden" name="status" value="NOT_STARTED" />
    <label className={labelClass}>Subtopic title<input name="title" required className={inputClass} /></label>
    <label className={labelClass}>Description<input name="description" className={inputClass} /></label>
    <button className={buttonClass}>Add subtopic</button>
  </form>;
}

export function LessonCard({ lesson }: { lesson: CatalogLesson }) {
  return <article className="rounded-xl border border-stone-200 bg-white p-4">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><Link href={`/catalog/lessons/${lesson.id}`} className="font-medium text-stone-900 underline decoration-stone-300 underline-offset-4">{lesson.title}</Link><p className="mt-1 text-sm text-stone-500">{lesson.topics.length} topic{lesson.topics.length === 1 ? "" : "s"} · {lesson.status.replaceAll("_", " ")}{lesson.archivedAt ? " · Archived" : ""}</p></div></div>
    {lesson.description && <p className="mt-3 text-sm text-stone-600">{lesson.description}</p>}
  </article>;
}

export function LessonEditor({ lesson, learningItemId }: { lesson: CatalogLesson; learningItemId: string }) {
  return <div className="space-y-4"><form action={updateLessonAction} className="grid gap-4 sm:grid-cols-2">
    <input type="hidden" name="id" value={lesson.id} /><input type="hidden" name="learningItemId" value={learningItemId} />
    <label className={labelClass}>Title<input name="title" required defaultValue={lesson.title} className={inputClass} /></label>
    <label className={labelClass}>Progress<select name="status" defaultValue={lesson.status} className={inputClass}>{statusOptions(lesson.status)}</select></label>
    <label className={`${labelClass} sm:col-span-2`}>Description<textarea name="description" defaultValue={lesson.description ?? ""} rows={2} className={inputClass} /></label>
    <label className={labelClass}>Started<input type="date" name="startedOn" defaultValue={dateField(lesson.startedOn)} className={inputClass} /></label>
    <label className={labelClass}>Completed<input type="date" name="completedOn" defaultValue={dateField(lesson.completedOn)} className={inputClass} /></label>
    <label className={labelClass}>Time taken (minutes)<input type="number" min="0" name="timeTakenMinutes" defaultValue={lesson.timeTakenMinutes ?? ""} className={inputClass} /></label>
    <label className={labelClass}>Notes<input name="notes" defaultValue={lesson.notes ?? ""} className={inputClass} /></label>
    <button className={`${buttonClass} justify-self-start`}>Save subtopic</button>
  </form><form action={deleteLessonAction} className="flex justify-end"><input type="hidden" name="id" value={lesson.id} /><input type="hidden" name="learningItemId" value={learningItemId} /><button className={dangerClass}>Delete / archive subtopic</button></form></div>;
}

export function TopicForm({ lessonId, topic, nextOrder }: { lessonId: string; topic?: CatalogTopic; nextOrder: number }) {
  const action = topic ? updateTopicAction : createTopicAction;
  return <form action={action} className="grid gap-3 rounded-lg bg-stone-50 p-4 sm:grid-cols-2">
    {topic && <input type="hidden" name="id" value={topic.id} />}
    <input type="hidden" name="lessonId" value={lessonId} />
    <label className={labelClass}>Topic title<input name="title" required defaultValue={topic?.title} className={inputClass} /></label>
    <label className={labelClass}>Order<input type="number" min="0" name="sortOrder" required defaultValue={topic?.sortOrder ?? nextOrder} className={inputClass} /></label>
    <label className={labelClass}>Progress<select name="status" defaultValue={topic?.status ?? "NOT_STARTED"} className={inputClass}>{statusOptions(topic?.status ?? "NOT_STARTED")}</select></label>
    <label className={labelClass}>Time taken (minutes)<input type="number" min="0" name="timeTakenMinutes" defaultValue={topic?.timeTakenMinutes ?? ""} className={inputClass} /></label>
    <label className={labelClass}>Started<input type="date" name="startedOn" defaultValue={dateField(topic?.startedOn ?? null)} className={inputClass} /></label>
    <label className={labelClass}>Completed<input type="date" name="completedOn" defaultValue={dateField(topic?.completedOn ?? null)} className={inputClass} /></label>
    <label className={`${labelClass} sm:col-span-2`}>Description<input name="description" defaultValue={topic?.description ?? ""} className={inputClass} /></label>
    <label className={`${labelClass} sm:col-span-2`}>Notes<input name="notes" defaultValue={topic?.notes ?? ""} className={inputClass} /></label>
    <button className={`${secondaryClass} justify-self-start`}>{topic ? "Save topic" : "Add topic"}</button>
  </form>;
}

export function TopicDeleteForm({ lessonId, topicId }: { lessonId: string; topicId: string }) {
  return <form action={deleteTopicAction}><input type="hidden" name="id" value={topicId} /><input type="hidden" name="lessonId" value={lessonId} /><button className="text-sm text-red-800 underline">Delete / archive</button></form>;
}

function statusOptions(value: string) {
  return <>{[["NOT_STARTED", "Not started"], ["IN_PROGRESS", "In progress"], ["COMPLETED", "Completed"]].map(([key, label]) => <option key={key} value={key}>{label}{key === value ? " (current)" : ""}</option>)}</>;
}

function dateField(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "";
}
