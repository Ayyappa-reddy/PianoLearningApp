import Link from "next/link";
import { notFound } from "next/navigation";
import { getCatalogService } from "@/infrastructure/catalog/catalog";
import { ErrorNotice, ItemDeleteForm, ItemEditor, LessonCard, LessonCreateForm, PrerequisiteForm } from "@/app/catalog/components";

export const dynamic = "force-dynamic";

export default async function LearningItemPage({ params, searchParams }: { params: Promise<{ itemId: string }>; searchParams: Promise<{ error?: string; message?: string; success?: string }> }) {
  const [{ itemId }, { error, message, success }] = await Promise.all([params, searchParams]);
  const service = getCatalogService();
  const [item, candidates, categories] = await Promise.all([service.getItem(itemId), service.listActiveItemCandidates(itemId), service.listCategories()]);
  if (!item) notFound();
  const visibleLessons = item.archivedAt ? item.lessons : item.lessons.filter((lesson) => !lesson.archivedAt);
  return <div className="space-y-8">
    <p className="text-sm text-stone-500"><Link href="/learn">Learn</Link> / <Link href={`/catalog/categories/${item.categoryId}`} className="underline">{item.category.name}</Link> / Main Topic</p>
    <header><p className="text-sm font-medium text-stone-500">Main Topic</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">{item.title}</h1>{item.archivedAt && <p className="mt-2 text-sm text-stone-500">Archived and retained for history</p>}</header>
    <ErrorNotice code={error} message={message} success={success} />
    <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7"><h2 className="mb-5 text-lg font-semibold">Main Topic details</h2><ItemEditor item={item} categories={categories} /></section>
    <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7"><div className="mb-4"><h2 className="text-lg font-semibold">Prerequisites</h2><p className="mt-1 text-sm text-stone-600">Informational only. They never prevent studying or completing this item.</p></div><PrerequisiteForm item={item} candidates={candidates} /></section>
    <section className="space-y-4">
      <div><h2 className="text-xl font-semibold">Subtopics</h2><p className="mt-1 text-sm text-stone-600">Add smaller subjects you want to learn under this Main Topic.</p></div>
      {!item.archivedAt && <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7"><h3 className="mb-4 font-medium">Add Subtopic</h3><LessonCreateForm learningItemId={item.id} /></div>}
      {visibleLessons.length ? <div className="space-y-3">{visibleLessons.map((lesson) => <LessonCard key={lesson.id} lesson={lesson} />)}</div> : <p className="rounded-xl border border-dashed border-stone-300 p-6 text-sm text-stone-600">No Subtopics yet.</p>}
    </section>
    <div className="flex justify-end"><ItemDeleteForm item={item} /></div>
  </div>;
}
