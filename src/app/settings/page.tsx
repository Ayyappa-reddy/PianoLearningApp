import { getPrismaClient } from "@/infrastructure/database/prisma";
import { getOrCreateOwnerProfile } from "@/infrastructure/product/profile-repository";
import { PageTitle, Panel, Notice, inputClass, buttonClass } from "@/app/workflows/components";
import { updateTimezoneAction } from "@/app/workflows/actions";
export const dynamic = "force-dynamic";
export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const [profile, params] = await Promise.all([getOrCreateOwnerProfile(getPrismaClient()), searchParams]);
  return <><PageTitle title="Settings" description="Your timezone controls local calendar days, weekly periods, and streaks."/><Notice error={params.error} success={params.success}/><Panel title="Timezone"><form action={updateTimezoneAction} className="flex flex-wrap items-end gap-3"><label className="grid gap-1 text-sm">IANA timezone<input required name="timezoneName" defaultValue={profile.timezoneName} placeholder="Europe/Berlin" className={inputClass}/></label><button className={buttonClass}>Save timezone</button></form></Panel></>;
}
