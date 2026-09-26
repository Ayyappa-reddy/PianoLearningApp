import Link from "next/link";
import { getPrismaClient } from "@/infrastructure/database/prisma";
import { dashboardData } from "@/infrastructure/product/progress-repository";

export const dynamic = "force-dynamic";

const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours && remainder) return `${hours}h ${remainder}m`;
  if (hours) return `${hours}h`;
  return `${remainder}m`;
}

function formatLongDate(value: string) {
  const [year, month, date] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, date)));
}

function formatMonth(value: string) {
  const [year, month] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function dateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

function goalStatus(status: string) {
  if (status === "COMPLETED") return "Done";
  if (status === "IN_PROGRESS") return "In progress";
  return "Not touched";
}

export default async function HomePage() {
  const data = await dashboardData(getPrismaClient());
  const period = data.activePeriod;
  const goals = period?.goals ?? [];
  const mainGoals = goals.filter((goal) => goal.kind === "MAIN");
  const completedMain = mainGoals.filter((goal) => goal.status === "COMPLETED").length;
  const extraGoals = goals.filter((goal) => goal.kind === "EXTRA");
  const practicedDays = new Set(data.practiceDates.map((record) => dateKey(record.practicedOn)));
  const [year, month] = data.today.split("-").map(Number);
  const firstWeekday = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const calendarCells = [
    ...Array.from({ length: firstWeekday }, (_, index) => ({ key: `empty-${index}`, day: null as number | null })),
    ...Array.from({ length: daysInMonth }, (_, index) => ({ key: `day-${index + 1}`, day: index + 1 })),
  ];
  const weekRows = Array.from({ length: Math.ceil(calendarCells.length / 7) }, (_, index) => calendarCells.slice(index * 7, index * 7 + 7));
  const featuredGoals = goals.slice(0, 2);
  const additionalGoals = goals.slice(2, 6);

  return <div className="home-dashboard">
    <header className="welcome-header">
      <div className="welcome-copy">
        <span className="home-kicker">YOUR PIANO JOURNEY</span>
        <h1>Welcome back <span aria-hidden="true">👋</span></h1>
        <p>{formatLongDate(data.today)} <span className="welcome-dot">·</span> one step at a time</p>
      </div>
      <div className="welcome-actions">
        <Link className="home-create-button" href="/create"><span aria-hidden="true">＋</span> Create</Link>
        <Link className="home-profile-mark" href="/settings" aria-label="Open settings">♩</Link>
      </div>
    </header>

    <div className="home-dashboard-grid">
      <div className="home-primary-column">
        <section aria-labelledby="home-activities-heading" className="home-block">
          <div className="home-block-heading">
            <div><span className="home-kicker">YOUR PLAN</span><h2 id="home-activities-heading">This week <span className="heading-count">({goals.length})</span></h2></div>
            <Link className="home-text-link" href={period ? "/this-week" : "/create/weekly-plan"}>{period ? "View week" : "Plan a week"}<span aria-hidden="true">↗</span></Link>
          </div>
          {featuredGoals.length ? <div className="home-featured-goals">
            {featuredGoals.map((goal, index) => <Link key={goal.id} className={`home-featured-card ${index === 0 ? "tone-mint" : "tone-pink"}`} href="/this-week">
              <span className="home-card-badge">{goal.kind === "MAIN" ? "Main goal" : "Extra goal"}</span>
              <span className="home-goal-title">{goal.title}</span>
              <span className="home-goal-meta">{goalStatus(goal.status)}<span aria-hidden="true"> · </span>{goal.learningItemId ? "Learning item" : goal.lessonId ? "Lesson" : goal.topicId ? "Topic" : goal.songSectionId ? "Song section" : goal.songId ? "Song" : "Personal goal"}</span>
              <span className="home-round-arrow" aria-hidden="true">↗</span>
            </Link>)}
          </div> : <div className="home-empty-plan">
            <span className="home-empty-note-mark" aria-hidden="true">♪</span>
            <div><strong>{period ? "Your week is ready for a goal" : "Start with a week that feels right"}</strong><p>{period ? "Add a main goal or an optional extra whenever you like." : "Choose what you would like to learn. Nothing is added automatically."}</p></div>
            <Link href={period ? "/this-week" : "/create/weekly-plan"} aria-label={period ? "Add a weekly goal" : "Create a weekly plan"}>↗</Link>
          </div>}
        </section>

        <section aria-labelledby="home-progress-heading" className="home-block home-progress-block">
          <div className="home-block-heading">
            <div><span className="home-kicker">THE WORK YOU’VE DONE</span><h2 id="home-progress-heading">Learning progress</h2></div>
            <Link className="home-text-link" href="/progress">See progress<span aria-hidden="true">↗</span></Link>
          </div>
          <div className="home-stat-grid">
            <Link href="/learn" className="home-stat-card tone-mint"><span>Lessons completed</span><strong>{data.completedLessons}</strong><i aria-hidden="true">↗</i></Link>
            <Link href="/learn" className="home-stat-card tone-yellow"><span>Learning items</span><strong>{data.completedLearningItems}</strong><i aria-hidden="true">↗</i></Link>
            <Link href="/songs" className="home-stat-card tone-lilac"><span>Songs completed</span><strong>{data.completedSongs}</strong><i aria-hidden="true">↗</i></Link>
          </div>
        </section>

        <section className="home-focus-card tone-yellow" aria-label="Weekly goal summary">
          <span className="home-focus-icon" aria-hidden="true">♬</span>
          <div className="home-focus-copy">
            <span className="home-kicker">A GENTLE CHECK-IN</span>
            <h2>{period ? `${completedMain} of ${mainGoals.length} main goals completed` : "Make space for a little music"}</h2>
            <p>{period ? `${extraGoals.length} optional ${extraGoals.length === 1 ? "extra goal" : "extra goals"} in this week. Extras never hold back week completion.` : "Your learning plan is yours to shape, one week at a time."}</p>
          </div>
          <Link className="home-round-arrow" href={period ? "/this-week" : "/create/weekly-plan"} aria-label={period ? "Open this week" : "Create a weekly plan"}>↗</Link>
        </section>
      </div>

      <aside className="home-secondary-column">
        <section className="home-calendar-card" aria-labelledby="calendar-heading">
          <div className="calendar-card-heading">
            <div><span className="home-kicker">YOUR PRACTICE DAYS</span><h2 id="calendar-heading">{formatMonth(data.today)}</h2></div>
            <Link href="/progress" aria-label="See practice calendar">↗</Link>
          </div>
          <div className="calendar-grid" role="grid" aria-label={`Practice calendar for ${formatMonth(data.today)}`}>
            {weekdayLabels.map((weekday) => <span className="calendar-weekday" role="columnheader" key={weekday}>{weekday}</span>)}
            {weekRows.flatMap((row, weekIndex) => row.map((cell, dayIndex) => {
              if (cell.day === null) return <span className="calendar-empty" role="gridcell" key={cell.key} />;
              const key = `${year}-${String(month).padStart(2, "0")}-${String(cell.day).padStart(2, "0")}`;
              const isToday = key === data.today;
              const practiced = practicedDays.has(key);
              return <span className={`calendar-day${isToday ? " is-today" : ""}${practiced ? " has-practice" : ""}`} role="gridcell" aria-label={`${formatLongDate(key)}${practiced ? ", practice recorded" : ""}${isToday ? ", today" : ""}`} key={`${weekIndex}-${dayIndex}`}>{cell.day}</span>;
            }))}
          </div>
          <div className="calendar-legend"><span><i className="legend-practice" /> Practice recorded</span><span><i className="legend-today" /> Today</span></div>
        </section>

        <section className="home-week-list" aria-labelledby="week-list-heading">
          <div className="home-block-heading compact-heading">
            <div><span className="home-kicker">KEEP IT CLOSE</span><h2 id="week-list-heading">On your list</h2></div>
            <Link className="home-text-link" href={period ? "/this-week" : "/create/weekly-plan"} aria-label="Open weekly goals">↗</Link>
          </div>
          {additionalGoals.length ? <div className="home-goal-list">{additionalGoals.map((goal) => <Link href="/this-week" className="home-goal-row" key={goal.id}>
            <span className={`home-goal-check${goal.status === "COMPLETED" ? " is-done" : ""}`}>{goal.status === "COMPLETED" ? "✓" : ""}</span>
            <span className="home-goal-row-copy"><strong>{goal.title}</strong><small>{goal.kind === "MAIN" ? "Main goal" : "Extra goal"} · {goalStatus(goal.status)}</small></span>
            <span className="home-row-arrow" aria-hidden="true">↗</span>
          </Link>)}</div> : <div className="home-week-note">
            <span className="home-week-note-icon" aria-hidden="true">♩</span>
            <p>{goals.length > 2 ? "You’re all caught up. Your other goals are shown above." : "A small practice counts. Your week is here whenever you’re ready."}</p>
          </div>}
          <Link className="home-week-footer" href="/practice"><span className="practice-footer-icon" aria-hidden="true">♪</span><span><strong>{data.durations.week ? `${formatDuration(data.durations.week)} practiced this week` : "Log a practice when you’re done"}</strong><small>Practice is always recorded by you</small></span><span aria-hidden="true">↗</span></Link>
        </section>

        <section className="home-streak-card tone-pink">
          <span className="streak-flower" aria-hidden="true">✳</span>
          <span className="home-kicker">SHOWING UP, YOUR WAY</span>
          <div><strong>{data.currentStreak}</strong><span>{data.currentStreak === 1 ? "day" : "days"} in your current login streak</span></div>
          <p>Your longest streak is {data.longestStreak} {data.longestStreak === 1 ? "day" : "days"}.</p>
        </section>
      </aside>
    </div>
  </div>;
}
