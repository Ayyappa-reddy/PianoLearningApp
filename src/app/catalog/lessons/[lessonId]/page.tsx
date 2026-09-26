import Link from "next/link";
import { notFound } from "next/navigation";
import { getCatalogService } from "@/infrastructure/catalog/catalog";
import { ErrorNotice, LessonEditor, TopicDeleteForm, TopicForm } from "@/app/catalog/components";

export const dynamic = "force-dynamic";

export default async function LessonPage({ params, searchParams }: { params: Promise<{ lessonId: string }>; searchParams: Promise<{ error?: string; message?: string; success?: string }> }) {
  const [{ lessonId }, { error, message, success }] = await Promise.all([params, searchParams]);
  const lesson = await getCatalogService().getLesson(lessonId);
  if (!lesson) notFound();
  const visibleTopics = lesson.archivedAt || lesson.learningItem.archivedAt ? lesson.topics : lesson.topics.filter((topic) => !topic.archivedAt);
  const activeTopics = visibleTopics.filter((topic) => !topic.archivedAt);
  const nextOrder = activeTopics.length ? Math.max(...activeTopics.map((topic) => topic.sortOrder)) + 1 : 0;
  return <div className="space-y-8">
    <p className="text-sm text-stone-500"><Link href="/learn">Learn</Link> / <Link href={`/catalog/items/${lesson.learningItem.id}`} className="underline">{lesson.learningItem.title}</Link> / Subtopic</p>
    <header><p className="text-sm font-medium text-stone-500">Subtopic</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">{lesson.title}</h1>{lesson.archivedAt && <p className="mt-2 text-sm text-stone-500">Archived and retained for history</p>}</header>
    <ErrorNotice code={error} message={message} success={success} />
    <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7"><h2 className="mb-5 text-lg font-semibold">Subtopic details</h2><LessonEditor lesson={lesson} learningItemId={lesson.learningItem.id} /></section>
    <section className="space-y-4"><div><h2 className="text-xl font-semibold">Topics</h2><p className="mt-1 text-sm text-stone-600">Track each topic independently. Order is for display only.</p></div>
      {visibleTopics.map((topic) => <article key={topic.id} className="space-y-3 rounded-2xl border border-stone-200 bg-white p-4 sm:p-6"><div className="flex items-center justify-between gap-3"><h3 className="font-medium">{topic.title}{topic.archivedAt && <span className="ml-2 text-xs text-stone-500">Archived</span>}</h3><TopicDeleteForm lessonId={lesson.id} topicId={topic.id} /></div><TopicForm lessonId={lesson.id} topic={topic} nextOrder={nextOrder} /></article>)}
      {!lesson.archivedAt && !lesson.learningItem.archivedAt && <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7"><h3 className="mb-4 font-medium">Add topic</h3><TopicForm lessonId={lesson.id} nextOrder={nextOrder} /></div>}
      {!visibleTopics.length && <p className="rounded-xl border border-dashed border-stone-300 p-6 text-sm text-stone-600">No topics yet.</p>}
    </section>
  </div>;
}
