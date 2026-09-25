import { checkDatabase } from "@/application/health/check-database";

export const dynamic = "force-dynamic";

export default async function StatusPage() {
  const database = await checkDatabase();
  const isAvailable = database.status === "available";

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-sm font-medium text-stone-500">System status</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">Application foundation</h1>
      </div>
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold text-stone-900">PostgreSQL connection</h2>
            <p className="mt-1 text-sm text-stone-600">
              {isAvailable ? "The application can reach the configured database." : "Database access is not currently available."}
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-sm font-medium ${isAvailable ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>
            {isAvailable ? "Connected" : "Not connected"}
          </span>
        </div>
        {!isAvailable && (
          <p className="mt-4 border-t border-stone-100 pt-4 text-sm text-stone-600">
            Configure a valid database connection in the local environment to enable persistence checks.
          </p>
        )}
      </div>
    </section>
  );
}
