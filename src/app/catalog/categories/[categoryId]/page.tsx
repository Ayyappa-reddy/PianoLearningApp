import Link from "next/link";
import { notFound } from "next/navigation";
import { getCatalogService } from "@/infrastructure/catalog/catalog";
import { CategoryEditor, ErrorNotice, ItemCard, ItemCreateForm } from "@/app/catalog/components";

export const dynamic = "force-dynamic";

export default async function CategoryPage({ params, searchParams }: { params: Promise<{ categoryId: string }>; searchParams: Promise<{ error?: string; message?: string; success?: string }> }) {
  const [{ categoryId }, { error, message, success }] = await Promise.all([params, searchParams]);
  const category = await getCatalogService().getCategory(categoryId);
  if (!category) notFound();
  const visibleItems = category.archivedAt ? category.learningItems : category.learningItems.filter((item) => !item.archivedAt);
  return <div className="space-y-8">
    <p className="text-sm text-stone-500"><Link href="/learn" className="underline">Learn</Link> / Category</p>
    <header><p className="text-sm font-medium text-stone-500">Category</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">{category.name}</h1></header>
    <ErrorNotice code={error} message={message} success={success} />
    <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7"><h2 className="mb-5 text-lg font-semibold">Edit category</h2><CategoryEditor category={category} /></section>
    <section className="space-y-4">
      <div><h2 className="text-xl font-semibold">Main Topics</h2><p className="mt-1 text-sm text-stone-600">Main Topics belong to one category and may contain Subtopics.</p></div>
      {!category.archivedAt && <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7"><h3 className="mb-4 font-medium">Add Main Topic</h3><ItemCreateForm categoryId={category.id} /></div>}
      {visibleItems.length ? <div className="grid gap-3 sm:grid-cols-2">{visibleItems.map((item) => <ItemCard key={item.id} item={item} />)}</div> : <p className="rounded-xl border border-dashed border-stone-300 p-6 text-sm text-stone-600">No active Main Topics in this category.</p>}
    </section>
  </div>;
}
