import Link from "next/link";

export default function HomePage() {
  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-sm font-medium text-stone-500">Your piano-learning journey</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
          A foundation for your progress
        </h1>
      </div>
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="max-w-2xl leading-7 text-stone-700">
          This personal application will help you record the learning goals, practice, repertoire,
          and milestones you choose. The foundation is in place; learning and planning screens will
          be added in later development phases.
        </p>
        <Link href="/status" className="mt-6 inline-flex rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-stone-700">
          Check system status
        </Link>
      </div>
    </section>
  );
}
