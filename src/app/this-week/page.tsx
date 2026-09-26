import Link from "next/link";
import { getPrismaClient } from "@/infrastructure/database/prisma";
import { listPlanning, pendingOffers } from "@/infrastructure/product/planning-repository";
import { PageTitle, Panel, Notice, inputClass, buttonClass } from "@/app/workflows/components";
import { createGoalAction, updateGoalStatusAction, decideCarryAction, deferGoalAction, undoDeferGoalAction } from "@/app/workflows/actions";
export const dynamic = "force-dynamic";
function day(value: Date) { return value.toISOString().slice(0,10); }
export default async function ThisWeekPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string; undoGoal?: string }> }) {
  const db = getPrismaClient();
  const [{ periods }, params, topics, songs, items, lessons] = await Promise.all([
    listPlanning(db), searchParams,
    db.topic.findMany({ where: { archivedAt: null }, include: { lesson: { include: { learningItem: true } } }, orderBy: { title: "asc" } }),
    db.song.findMany({ where: { archivedAt: null }, orderBy: { title: "asc" } }),
    db.learningItem.findMany({ where: { archivedAt: null }, orderBy: { title: "asc" } }),
    db.lesson.findMany({ where: { archivedAt: null }, include: { learningItem: true }, orderBy: { title: "asc" } }),
  ]);
  const active = periods[0];
  const offers = active ? await pendingOffers(db, active.id) : [];
  return <>
    <PageTitle title="This Week" description="Your seven-day plan. Main goals determine whether the week is complete; Extra goals are optional."/>
    <Notice error={params.error} success={params.success}/>
    <p className="mb-4 flex flex-wrap gap-4 text-sm"><Link className="underline" href="/create/weekly-plan">Create a weekly plan</Link><Link className="underline" href="/create/personal-goal">Create a personal goal</Link><Link className="underline" href="/planning">Planning history and personal goals</Link></p>
    {active ? <>
      <Panel title={"Week of " + day(active.startOn)}>
        <p>{day(active.startOn)} through {day(new Date(active.startOn.getTime()+6*86400000))} · {active.goals.filter(g=>g.kind==="MAIN"&&g.status==="COMPLETED").length} / {active.goals.filter(g=>g.kind==="MAIN").length} Main goals complete</p>
        {active.goals.length ? <div className="mt-4 space-y-3">{active.goals.map((goal)=><article key={goal.id} className="rounded border p-3">
          <p className="font-medium">{goal.title} <span className="text-sm font-normal">({goal.kind === "MAIN" ? "Main" : "Extra"})</span></p>
          <form action={updateGoalStatusAction} className="mt-2 flex flex-wrap items-end gap-2"><input type="hidden" name="goalId" value={goal.id}/><label className="grid gap-1 text-xs">Status<select name="status" defaultValue={goal.status} className={inputClass}><option value="NOT_TOUCHED">Not touched</option><option value="PARTIALLY_COMPLETED">Partially completed</option><option value="COMPLETED">Completed</option></select></label><label className="grid gap-1 text-xs">Completed<input type="date" name="completedOn" defaultValue={goal.completedOn ? day(goal.completedOn) : ""} className={inputClass}/></label><label className="grid gap-1 text-xs">Rating<select name="rating" defaultValue={goal.rating ?? ""} className={inputClass}><option value="">—</option>{[1,2,3,4,5].map((n)=><option key={n}>{n}</option>)}</select></label><button className={buttonClass}>Save</button></form>
          {goal.status!=="COMPLETED" && <form action={deferGoalAction} className="mt-2"><input type="hidden" name="goalId" value={goal.id}/><input type="hidden" name="weeklyPeriodId" value={active.id}/><button className="text-sm underline">Learn Later</button></form>}
          {params.undoGoal===goal.id && <form action={undoDeferGoalAction} className="mt-2"><input type="hidden" name="goalId" value={goal.id}/><input type="hidden" name="weeklyPeriodId" value={active.id}/><button className="text-sm underline">Undo Learn Later</button></form>}
        </article>)}</div> : <p className="mt-3">No goals yet.</p>}
        {active.mainGoalsCompletedAt && <p className="mt-3 text-sm">Main goals completed on {active.mainGoalsCompletedAt.toLocaleDateString()}.</p>}
      </Panel>
      <Panel title="Add a goal"><form action={createGoalAction} className="grid gap-3 sm:grid-cols-2"><input type="hidden" name="weeklyPeriodId" value={active.id}/><label className="grid gap-1 text-sm">Title<input required name="title" className={inputClass}/></label><label className="grid gap-1 text-sm">Type<select name="kind" className={inputClass}><option value="MAIN">Main</option><option value="EXTRA">Extra</option></select></label><label className="grid gap-1 text-sm sm:col-span-2">Related item (optional)<select name="target" className={inputClass}><option value="">None</option>{items.map(item=><option key={item.id} value={"learningItemId:"+item.id}>{item.title}</option>)}{lessons.map(lesson=><option key={lesson.id} value={"lessonId:"+lesson.id}>{lesson.learningItem.title+" → "+lesson.title}</option>)}{topics.map(topic=><option key={topic.id} value={"topicId:"+topic.id}>{topic.lesson.learningItem.title+" → "+topic.lesson.title+" → "+topic.title}</option>)}{songs.map(song=><option key={song.id} value={"songId:"+song.id}>{song.title}</option>)}</select></label><label className="grid gap-1 text-sm sm:col-span-2">Notes<textarea name="notes" className={inputClass}/></label><button className={buttonClass+" justify-self-start"}>Add goal</button></form></Panel>
      {offers.length>0 && <Panel title="Items left from earlier weeks"><p className="mb-3 text-sm">{offers.length>=4 ? "Four or more pending items are added as Main goals." : "Choose to add each one or leave it for a future week."}</p>{offers.map(offer=><div key={offer.id} className="flex flex-wrap items-center justify-between gap-2 border-t py-3"><p>{offer.currentGoal.title} <span className="text-sm text-stone-600">(from week #{offer.originGoal.weeklyPeriod.sequenceNo})</span></p>{offers.length<4&&<div className="flex gap-2"><form action={decideCarryAction}><input type="hidden" name="carryForwardId" value={offer.id}/><input type="hidden" name="weeklyPeriodId" value={active.id}/><input type="hidden" name="decision" value="ADD"/><button className={buttonClass}>Add to this week</button></form><form action={decideCarryAction}><input type="hidden" name="carryForwardId" value={offer.id}/><input type="hidden" name="weeklyPeriodId" value={active.id}/><input type="hidden" name="decision" value="LATER"/><button className="rounded border px-3 py-2 text-sm">Later</button></form></div>}</div>)}</Panel>}
    </> : <Panel title="No weekly plan yet"><p>Create a seven-day planning period when you’re ready.</p><Link href="/create/weekly-plan" className="mt-3 inline-block underline">Create weekly plan</Link></Panel>}
  </>;
}

