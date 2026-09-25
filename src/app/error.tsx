"use client";

export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <section role="alert" className="mx-auto max-w-2xl rounded-2xl border border-rose-200 bg-white p-8">
      <h1 className="text-2xl font-semibold text-stone-900">Something went wrong</h1>
      <p className="mt-2 text-stone-600">The page could not be loaded. Please try again.</p>
      <button onClick={retry} className="mt-5 rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-stone-700">
        Try again
      </button>
    </section>
  );
}
