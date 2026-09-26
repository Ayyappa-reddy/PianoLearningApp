import { getPrismaClient } from "@/infrastructure/database/prisma";
import { createPeriodAction } from "@/app/workflows/actions";
import { PageTitle, Panel, Notice, inputClass, buttonClass } from "@/app/workflows/components";
export const dynamic = "force-dynamic";
export default async function WeeklyPlanCreatePage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const [profile, periods, params] = await Promise.all([getPrismaClient().ownerProfile.findFirst(),getPrismaClient().weeklyPeriod.findMany({orderBy:{sequenceNo:"desc"},take:1}),searchParams]);
  return <><PageTitle title="Create a Weekly Plan" description="Each planning period covers exactly seven days in your configured timezone."/><Notice error={params.error} success={params.success}/><Panel title="Seven-day period"><form action={createPeriodAction} className="flex flex-wrap items-end gap-3"><label className="grid gap-1 text-sm">Start date<input required type="date" name="startOn" className={inputClass}/></label><input type="hidden" name="timezoneName" value={profile?.timezoneName ?? "Europe/Berlin"}/><button className={buttonClass}>Create weekly plan</button></form>{periods[0]&&<p className="mt-3 text-sm">Latest week starts {periods[0].startOn.toISOString().slice(0,10)}. The new week must not overlap an existing one.</p>}</Panel></>;
}