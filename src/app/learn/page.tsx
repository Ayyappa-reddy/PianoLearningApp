import Link from "next/link";
import { getCatalogService } from "@/infrastructure/catalog/catalog";
import { CategoryCreateForm } from "@/app/catalog/components";
import { PageTitle, Panel } from "@/app/workflows/components";

export const dynamic = "force-dynamic";
export default async function LearnPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string; success?: string }> }) {
  const [categories, query] = await Promise.all([getCatalogService().listCategories(), searchParams]);
  const active = categories.filter((category) => !category.archivedAt);
  return <>
    <PageTitle title="Learn" description="Your topics, organized the way you choose. Nothing here creates a weekly goal automatically." />
    {query.error && <p role="alert" className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm">{query.message ?? "The change could not be completed."}</p>}
    {query.success && <p role="status" className="mb-4 rounded border border-green-300 bg-green-50 p-3 text-sm">{query.success}</p>}
    <div className="mb-5 flex flex-wrap gap-3"><Link className="rounded border px-3 py-2 text-sm underline" href="/learn/archived">Archived learning</Link><Link className="rounded border px-3 py-2 text-sm underline" href="/create/main-topic">Create a Main Topic</Link><Link className="rounded border px-3 py-2 text-sm underline" href="/create/subtopic">Create a Subtopic</Link></div>
    <Panel title="Categories"><CategoryCreateForm />
      <div className="mt-5 space-y-5">{active.map((category) => {
        const items = category.learningItems.filter((item) => !item.archivedAt);
        return <section key={category.id} className="border-t pt-4">
          <div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="font-semibold">{category.name}</h2>{category.description && <p className="text-sm text-stone-600">{category.description}</p>}</div><Link className="text-sm underline" href={"/catalog/categories/" + category.id}>Manage category</Link></div>
          {items.length ? <ul className="mt-3 space-y-2">{items.map((item) => <li key={item.id} className="rounded border p-3"><Link href={"/catalog/items/" + item.id} className="font-medium underline">{item.title}</Link><span className="ml-2 text-sm text-stone-600">{item.status === "COMPLETED" ? "Completed" : item.status === "IN_PROGRESS" ? "In progress" : "Not started"}</span></li>)}</ul> : <p className="mt-3 text-sm text-stone-500">No active Main Topics yet.</p>}
        </section>;
      })}</div>
      {!active.length && <p className="mt-4 text-sm text-stone-600">Create a category to begin.</p>}
    </Panel>
  </>;
}