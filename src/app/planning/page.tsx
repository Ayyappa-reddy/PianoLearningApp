import { getPrismaClient } from "@/infrastructure/database/prisma";
import { listPlanning, pendingOffers } from "@/infrastructure/product/planning-repository";
import { PageTitle, Panel, Notice, inputClass, buttonClass, dangerButtonClass } from "@/app/workflows/components";
import { createPeriodAction, createGoalAction, updateGoalStatusAction, decideCarryAction, deferGoalAction, createPersonalGoalAction, archivePersonalGoalAction, updatePersonalGoalAction, updateGoalDetailsAction } from "@/app/workflows/actions";

export const dynamic = "force-dynamic";

function date(value: Date | null) { return value?.toISOString().slice(0, 10) ?? ""; }
export default async function PlanningPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const [{ profile, periods, personalGoals }, params, topics, songs, items, lessons] = await Promise.all([
    listPlanning(getPrismaClient()), searchParams,
    getPrismaClient().topic.findMany({ where: { archivedAt: null }, include: { lesson: { include: { learningItem: true } } }, orderBy: { title: "asc" } }),
    getPrismaClient().song.findMany({ where: { archivedAt: null }, orderBy: { title: "asc" } }),
    getPrismaClient().learningItem.findMany({ where: { archivedAt: null }, orderBy: { title: "asc" } }),
    getPrismaClient().lesson.findMany({ where: { archivedAt: null }, include: { learningItem: true }, orderBy: { title: "asc" } }),
  ]);
  const active = periods[0];
  const offers = active ? await pendingOffers(getPrismaClient(), active.id) : [];
  return <>
    <PageTitle title="Weekly planning" description="Each planning period is exactly seven days. Main goals determine completion; Extra goals are optional." />
    <Notice error={params.error} success={params.success} />
    <Panel title="Create next planning period">
      <form action={createPeriodAction} className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-sm">Start date<input required type="date" name="startOn" className={inputClass} /></label>
        <input type="hidden" name="timezoneName" value={profile.timezoneName} />
        <button className={buttonClass}>Create 7-day period</button>
      </form>
      {active && <p className="mt-3 text-sm text-stone-600">Latest period: #{active.sequenceNo}, {date(active.startOn)} to {date(new Date(active.startOn.getTime() + 6 * 86400000))}. Start the next period on or after {date(new Date(active.startOn.getTime() + 7 * 86400000))}.</p>}
    </Panel>
    {active && offers.length > 0 && <Panel title="Pending Learn Later / carry-forward items">
      <p className="mb-3 text-sm">{offers.length >= 4 ? "Four or more items were automatically added as Main goals." : "Choose whether to add each item to this period or defer it again."}</p>
      {offers.map((offer) => <div key={offer.id} className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b pb-3">
        <p>{offer.currentGoal.title} <span className="text-sm text-stone-600">(origin period #{offer.originGoal.weeklyPeriod.sequenceNo})</span></p>
        {offers.length < 4 && <div className="flex gap-2"><form action={decideCarryAction}><input type="hidden" name="carryForwardId" value={offer.id} /><input type="hidden" name="weeklyPeriodId" value={active.id} /><input type="hidden" name="decision" value="ADD" /><button className={buttonClass}>Add to this week</button></form><form action={decideCarryAction}><input type="hidden" name="carryForwardId" value={offer.id} /><input type="hidden" name="weeklyPeriodId" value={active.id} /><input type="hidden" name="decision" value="LATER" /><button className="rounded border px-3 py-2 text-sm">Later</button></form></div>}
      </div>)}
    </Panel>}
    {active && <Panel title={`Add goal to period #${active.sequenceNo}`}>
      <form action={createGoalAction} className="grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="weeklyPeriodId" value={active.id} />
        <label className="grid gap-1 text-sm">Goal title<input required name="title" className={inputClass} /></label>
        <label className="grid gap-1 text-sm">Type<select name="kind" className={inputClass}><option value="MAIN">Main</option><option value="EXTRA">Extra</option></select></label>
        <label className="grid gap-1 text-sm sm:col-span-2">Related target (optional)<select name="target" className={inputClass}><option value="">None</option>{topics.map((topic) => <option key={topic.id} value={`topicId:${topic.id}`}>{topic.lesson.learningItem.title} → {topic.lesson.title} → {topic.title}</option>)}{lessons.map((lesson) => <option key={lesson.id} value={`lessonId:${lesson.id}`}>{lesson.learningItem.title} → {lesson.title}</option>)}{items.map((item) => <option key={item.id} value={`learningItemId:${item.id}`}>{item.title}</option>)}{songs.map((song) => <option key={song.id} value={`songId:${song.id}`}>{song.title}</option>)}</select></label>
        <label className="grid gap-1 text-sm sm:col-span-2">Notes<textarea name="notes" className={inputClass} /></label>
        <button className={`${buttonClass} justify-self-start`}>Add goal</button>
      </form>
    </Panel>}
    <Panel title="Personal goals">
      <form action={createPersonalGoalAction} className="mb-4 grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">Title<input required name="title" className={inputClass} /></label>
        <label className="grid gap-1 text-sm">Type<select name="kind" className={inputClass}><option value="LONG_TERM">Long-term</option><option value="PRACTICE">Practice target</option></select></label>
        <input type="hidden" name="status" value="ACTIVE" /><label className="grid gap-1 text-sm">Start date<input type="date" name="startsOn" className={inputClass} /></label><label className="grid gap-1 text-sm">Target date<input type="date" name="targetOn" className={inputClass} /></label>
        <label className="grid gap-1 text-sm">Practice target minutes<input type="number" min="1" name="targetMinutes" className={inputClass} /></label><label className="grid gap-1 text-sm">Practice days<input type="number" min="1" name="targetPracticeDays" className={inputClass} /></label><label className="grid gap-1 text-sm">Target period<select name="targetPeriod" className={inputClass}><option value="">None</option>{["WEEK","MONTH","YEAR","ALL_TIME"].map((p) => <option key={p}>{p}</option>)}</select></label>
        <label className="grid gap-1 text-sm sm:col-span-2">Notes<textarea name="notes" className={inputClass} /></label><button className={`${buttonClass} justify-self-start`}>Add personal goal</button>
      </form>
      {personalGoals.map((goal) => <div key={goal.id} className="border-t py-3"><form action={updatePersonalGoalAction} className="flex flex-wrap items-end gap-2"><input type="hidden" name="id" value={goal.id}/><input type="hidden" name="kind" value={goal.kind}/><label className="grid gap-1 text-xs">Title<input name="title" defaultValue={goal.title} className={inputClass}/></label><label className="grid gap-1 text-xs">Status<select name="status" defaultValue={goal.status} className={inputClass}>{["ACTIVE","COMPLETED","PAUSED","CANCELLED"].map(s=><option key={s}>{s}</option>)}</select></label><label className="grid gap-1 text-xs">Started<input type="date" name="startsOn" defaultValue={date(goal.startsOn)} className={inputClass}/></label><label className="grid gap-1 text-xs">Target<input type="date" name="targetOn" defaultValue={date(goal.targetOn)} className={inputClass}/></label><label className="grid gap-1 text-xs">Completed<input type="date" name="completedOn" defaultValue={date(goal.completedOn)} className={inputClass}/></label><input type="hidden" name="targetMinutes" value={goal.targetMinutes ?? ""}/><input type="hidden" name="targetPracticeDays" value={goal.targetPracticeDays ?? ""}/><input type="hidden" name="targetPeriod" value={goal.targetPeriod ?? ""}/><input type="hidden" name="rating" value={goal.rating ?? ""}/><input type="hidden" name="notes" value={goal.notes ?? ""}/><button className={buttonClass}>Save</button></form><form action={archivePersonalGoalAction} className="mt-2"><input type="hidden" name="id" value={goal.id}/><button className={dangerButtonClass}>Archive</button></form></div>)}
    </Panel>
    <div className="space-y-4">{periods.map((period) => <Panel key={period.id} title={`Period #${period.sequenceNo} — ${date(period.startOn)}${period.mainGoalsCompletedAt ? " · Main goals completed" : ""}`}>
      <div className="grid gap-3">
        {period.goals.map((goal) => <article key={goal.id} className="rounded border p-3">
          <p className="font-medium">{goal.title} <span className="text-sm font-normal text-stone-600">({goal.kind}, {goal.status.replaceAll("_", " ")})</span></p>
          <details className="mt-2"><summary className="cursor-pointer text-sm underline">Edit goal details</summary><form action={updateGoalDetailsAction} className="mt-2 grid gap-2 sm:grid-cols-2"><input type="hidden" name="goalId" value={goal.id}/><input type="hidden" name="weeklyPeriodId" value={period.id}/><label className="grid gap-1 text-xs">Title<input name="title" defaultValue={goal.title} className={inputClass}/></label><label className="grid gap-1 text-xs">Kind<select name="kind" defaultValue={goal.kind} className={inputClass}><option value="MAIN">Main</option><option value="EXTRA">Extra</option></select></label><label className="grid gap-1 text-xs sm:col-span-2">Notes<textarea name="notes" defaultValue={goal.notes ?? ""} className={inputClass}/></label><input type="hidden" name="target" value={goal.topicId ? `topicId:${goal.topicId}` : goal.lessonId ? `lessonId:${goal.lessonId}` : goal.learningItemId ? `learningItemId:${goal.learningItemId}` : goal.songId ? `songId:${goal.songId}` : goal.songSectionId ? `songSectionId:${goal.songSectionId}` : goal.personalGoalId ? `personalGoalId:${goal.personalGoalId}` : goal.reviewEntryId ? `reviewEntryId:${goal.reviewEntryId}` : ""}/><button className={`${buttonClass} justify-self-start`}>Save goal details</button></form></details>
          <form action={updateGoalStatusAction} className="mt-2 flex flex-wrap items-end gap-2">
            <input type="hidden" name="goalId" value={goal.id} />
            <label className="grid gap-1 text-xs">Status<select name="status" defaultValue={goal.status} className={inputClass}><option value="NOT_TOUCHED">Not touched</option><option value="PARTIALLY_COMPLETED">Partially completed</option><option value="COMPLETED">Completed</option></select></label>
            <label className="grid gap-1 text-xs">Started<input type="date" name="startedOn" defaultValue={date(goal.startedOn)} className={inputClass} /></label><label className="grid gap-1 text-xs">Completed<input type="date" name="completedOn" defaultValue={date(goal.completedOn)} className={inputClass} /></label>
            <label className="grid gap-1 text-xs">Rating<select name="rating" defaultValue={goal.rating ?? ""} className={inputClass}><option value="">—</option>{[1,2,3,4,5].map((n)=><option key={n}>{n}</option>)}</select></label><button className={buttonClass}>Save status</button>
          </form>
          {goal.status !== "COMPLETED" && <form action={deferGoalAction} className="mt-2"><input type="hidden" name="goalId" value={goal.id} /><input type="hidden" name="weeklyPeriodId" value={period.id} /><button className="rounded border px-3 py-2 text-sm">Learn Later</button></form>}
        </article>)}
        {!period.goals.length && <p className="text-sm text-stone-600">No goals in this period.</p>}
      </div>
    </Panel>)}</div>
  </>;
}
