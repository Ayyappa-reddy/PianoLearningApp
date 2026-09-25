import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto max-w-2xl rounded-2xl border border-stone-200 bg-white p-8">
      <h1 className="text-2xl font-semibold text-stone-900">Page not found</h1>
      <p className="mt-2 text-stone-600">That page may have moved or may not exist yet.</p>
      <Link href="/" className="mt-5 inline-block text-sm font-medium text-stone-900 underline underline-offset-4">Return home</Link>
    </section>
  );
}
