import "server-only";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { calculateStreak, localCalendarDateAt } from "@/domain/streak";
import { achievementIsEarned, dailyPracticeSeries, monthlyPracticeSeries, weeklyPracticeSeries, yearlyPracticeSeries, type AchievementEvaluatorKey, type AchievementMetrics, sortTimeline } from "@/domain/analytics";
import { getOrCreateOwnerProfile } from "./profile-repository";
import { endDateExclusive } from "@/domain/planning";
import { parseDateOnly } from "@/domain/product";
import { ProductError } from "@/application/product/errors";

const definitions = [
  ["first-practice", "First Practice", "Record your first manual practice session.", "count_practices", 1],
  ["first-completed-lesson", "First Completed Lesson", "Complete a lesson.", "completed_lessons", 1],
  ["first-completed-song", "First Completed Song", "Complete a song.", "completed_songs", 1],
  ["first-completed-week", "First Completed Week", "Complete the Main goals in a planning period.", "completed_weeks", 1],
  ["practice-10-hours", "10 Hours of Practice", "Record 10 hours of practice.", "practice_minutes", 600],
  ["practice-25-hours", "25 Hours of Practice", "Record 25 hours of practice.", "practice_minutes", 1500],
  ["practice-50-hours", "50 Hours of Practice", "Record 50 hours of practice.", "practice_minutes", 3000],
  ["practice-100-hours", "100 Hours of Practice", "Record 100 hours of practice.", "practice_minutes", 6000],
  ["first-review", "First Review", "Complete an optional review.", "completed_reviews", 1],
  ["login-streak-30", "30-Day Login Streak", "Reach a 30-day login streak, including grace days.", "login_streak", 30],
] as const;

function dateString(value: Date) { return value.toISOString().slice(0, 10); }
function dayDifference(date: Date, days: number) { const next = new Date(date); next.setUTCDate(next.getUTCDate() + days); return next; }

async function currentMetrics(prisma: PrismaClient): Promise<AchievementMetrics> {
  const [practices, practiceMinutes, completedLessons, completedSongs, completedWeeks, completedReviews, profile, loginDays] = await Promise.all([
    prisma.practiceRecord.count(),
    prisma.practiceRecord.aggregate({ _sum: { durationMinutes: true } }),
    prisma.lesson.count({ where: { status: "COMPLETED" } }),
    prisma.song.count({ where: { status: "COMPLETED" } }),
    prisma.weeklyPeriod.count({ where: { mainGoalsCompletedAt: { not: null } } }),
    prisma.review.count({ where: { status: "COMPLETED" } }),
    getOrCreateOwnerProfile(prisma),
    prisma.loginDay.findMany({ select: { firstLoginAt: true }, orderBy: { firstLoginAt: "asc" } }),
  ]);
  const today = localCalendarDateAt(new Date(), profile.timezoneName);
  const streak = calculateStreak([...new Set(loginDays.map(({ firstLoginAt }) => localCalendarDateAt(firstLoginAt, profile.timezoneName)))], today);
  return {
    count_practices: practices,
    completed_lessons: completedLessons,
    completed_songs: completedSongs,
    completed_weeks: completedWeeks,
    practice_minutes: practiceMinutes._sum.durationMinutes ?? 0,
    completed_reviews: completedReviews,
    login_streak: streak.longestStreak,
  };
}

export async function evaluateAchievements(prisma: PrismaClient, now = new Date()) {
  await prisma.achievementDefinition.createMany({
    data: definitions.map(([key, name, description, evaluatorKey, threshold]) => ({
      key, name, description, evaluatorKey, ruleConfig: { threshold },
    })), skipDuplicates: true,
  });
  const [metrics, definitionsInDb] = await Promise.all([
    currentMetrics(prisma), prisma.achievementDefinition.findMany({ where: { isActive: true }, orderBy: { key: "asc" } }),
  ]);
  for (const definition of definitionsInDb) {
    const config = definition.ruleConfig as { threshold?: unknown };
    if (!Number.isInteger(config.threshold) || !achievementIsEarned(definition.evaluatorKey as AchievementEvaluatorKey, Number(config.threshold), metrics)) continue;
    const snapshot = {
      key: definition.key, name: definition.name, description: definition.description,
      evaluatorKey: definition.evaluatorKey, ruleConfig: definition.ruleConfig,
    } satisfies Prisma.InputJsonObject;
    await prisma.awardedAchievement.upsert({
      where: { achievementDefinitionId: definition.id },
      create: {
        achievementDefinitionId: definition.id, earnedAt: now,
        definitionSnapshot: snapshot, evidenceSnapshot: { observed: metrics[definition.evaluatorKey as AchievementEvaluatorKey], metrics } satisfies Prisma.InputJsonObject,
      },
      update: {},
    });
  }
  return { metrics, definitions: definitionsInDb, awards: await prisma.awardedAchievement.findMany({ include: { definition: true }, orderBy: { earnedAt: "desc" } }) };
}

export async function createAchievementDefinition(prisma: PrismaClient, input: {
  key: string; name: string; description: string | null; evaluatorKey: string; threshold: number; isActive: boolean;
}) {
  try { return (await prisma.achievementDefinition.create({ data: {
    key: input.key, name: input.name, description: input.description,
    evaluatorKey: input.evaluatorKey, ruleConfig: { threshold: input.threshold }, isActive: input.isActive,
  }, select: { id: true } })).id; }
  catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new ProductError("DUPLICATE", "That achievement key already exists.");
    throw error;
  }
}

export async function listMilestones(prisma: PrismaClient) {
  const [milestones, categories] = await Promise.all([
    prisma.milestone.findMany({ include: { category: true }, orderBy: [{ happenedOn: "desc" }, { createdAt: "desc" }] }),
    prisma.category.findMany({ where: { archivedAt: null }, orderBy: { name: "asc" } }),
  ]);
  return { milestones, categories };
}

export async function createMilestone(prisma: PrismaClient, input: { title: string; description: string | null; happenedOn: string; categoryId: string | null }) {
  try { return (await prisma.milestone.create({ data: { ...input, happenedOn: parseDateOnly(input.happenedOn) }, select: { id: true } })).id; }
  catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") throw new ProductError("INVALID_REFERENCE", "Choose an existing category."); throw error; }
}

export async function updateMilestone(prisma: PrismaClient, id: string, input: { title: string; description: string | null; happenedOn: string; categoryId: string | null }) {
  try { await prisma.milestone.update({ where: { id }, data: { ...input, happenedOn: parseDateOnly(input.happenedOn) } }); }
  catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") throw new ProductError("NOT_FOUND", "Milestone no longer exists."); throw error; }
}

export async function deleteMilestone(prisma: PrismaClient, id: string) {
  try { await prisma.milestone.delete({ where: { id } }); }
  catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") throw new ProductError("NOT_FOUND", "Milestone no longer exists."); throw error; }
}

export async function dashboardData(prisma: PrismaClient, now = new Date()) {
  const profile = await getOrCreateOwnerProfile(prisma);
  const today = localCalendarDateAt(now, profile.timezoneName);
  const todayUtc = parseDateOnly(today);
  const monday = new Date(todayUtc);
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  const monthStart = new Date(Date.UTC(todayUtc.getUTCFullYear(), todayUtc.getUTCMonth(), 1));
  const yearStart = new Date(Date.UTC(todayUtc.getUTCFullYear(), 0, 1));
  const chartStart = new Date(Date.UTC(todayUtc.getUTCFullYear(), todayUtc.getUTCMonth() - 11, 1));
  const [periods, practice, practiceDates, categories, lessons, items, songs, cycles, loginDays, awards, milestones, progressChanges, recentRecords, allPracticeDates] = await Promise.all([
    prisma.weeklyPeriod.findMany({ include: { goals: { include: { practiceRecords: true } }, firstForCycle: true, secondForCycle: true, thirdForCycle: true }, orderBy: { sequenceNo: "desc" } }),
    prisma.practiceRecord.aggregate({ _sum: { durationMinutes: true }, _count: { id: true } }),
    prisma.practiceRecord.findMany({ where: { practicedOn: { gte: chartStart } }, select: { practicedOn: true, durationMinutes: true, categoryId: true, rating: true } }),
    prisma.category.findMany({ where: { archivedAt: null }, orderBy: { name: "asc" } }),
    prisma.lesson.count({ where: { status: "COMPLETED" } }),
    prisma.learningItem.count({ where: { status: "COMPLETED" } }),
    prisma.song.count({ where: { status: "COMPLETED" } }),
    prisma.reviewCycle.findMany({ include: { review: true }, orderBy: { cycleNumber: "desc" }, take: 3 }),
    prisma.loginDay.findMany({ select: { firstLoginAt: true }, orderBy: { firstLoginAt: "asc" } }),
    prisma.awardedAchievement.findMany({ include: { definition: true }, orderBy: { earnedAt: "desc" }, take: 5 }),
    prisma.milestone.findMany({ orderBy: { happenedOn: "desc" }, take: 5 }),
    prisma.learningProgressChange.findMany({ where: { effectiveOn: { not: null } }, include: { learningItem: true, lesson: true, topic: true, song: true, songSection: true }, orderBy: { recordedAt: "desc" }, take: 100 }),
    prisma.practiceRecord.findMany({ include: { category: true, topic: true, song: true, learningItem: true }, orderBy: [{ practicedOn: "desc" }, { recordedAt: "desc" }], take: 10 }),
    prisma.practiceRecord.findMany({ select: { practicedOn: true, durationMinutes: true }, orderBy: { practicedOn: "asc" } }),
  ]);
  const activePeriod = periods.find((period) => {
    const start = dateString(period.startOn);
    return today >= start && today < endDateExclusive(start);
  }) ?? periods[0] ?? null;
  const unfinishedPreviousGoals = activePeriod ? periods.filter((period) => period.sequenceNo < activePeriod.sequenceNo).flatMap((period) => period.goals.filter((goal) => goal.status !== "COMPLETED").map((goal) => ({ ...goal, periodSequence: period.sequenceNo }))) : [];
  const rangeStart = (days: number) => { const date = new Date(todayUtc); date.setUTCDate(date.getUTCDate() - days + 1); return date; };
  const durations = {
    today: practiceDates.filter((row) => dateString(row.practicedOn) === today).reduce((sum, row) => sum + row.durationMinutes, 0),
    week: practiceDates.filter((row) => row.practicedOn >= monday).reduce((sum, row) => sum + row.durationMinutes, 0),
    month: practiceDates.filter((row) => row.practicedOn >= monthStart).reduce((sum, row) => sum + row.durationMinutes, 0),
    year: practiceDates.filter((row) => row.practicedOn >= yearStart).reduce((sum, row) => sum + row.durationMinutes, 0),
    lifetime: practice._sum.durationMinutes ?? 0,
  };
  const datesThisMonth = new Set(practiceDates.filter((row) => row.practicedOn >= rangeStart(31)).map((row) => dateString(row.practicedOn)));
  const categoryTotals = categories.map((category) => ({
    id: category.id, name: category.name,
    minutes: practiceDates.filter((row) => row.categoryId === category.id).reduce((sum, row) => sum + row.durationMinutes, 0),
    rated: practiceDates.filter((row) => row.categoryId === category.id && row.rating !== null),
  }));
  const ratedCategories = categoryTotals.filter((category) => category.rated.length).map((category) => ({
    name: category.name, averageRating: category.rated.reduce((sum, row) => sum + (row.rating ?? 0), 0) / category.rated.length,
  }));
  const timeline = sortTimeline([
    ...milestones.map((milestone) => ({ id: milestone.id, date: dateString(milestone.happenedOn), kind: "Milestone", title: milestone.title })),
    ...awards.map((award) => ({ id: award.id, date: localCalendarDateAt(award.earnedAt, profile.timezoneName), kind: "Achievement", title: award.definition.name })),
    ...recentRecords.map((record) => ({ id: record.id, date: dateString(record.practicedOn), kind: "Practice", title: `${record.durationMinutes} min${record.topic ? ` · ${record.topic.title}` : record.song ? ` · ${record.song.title}` : record.learningItem ? ` · ${record.learningItem.title}` : ""}` })),
    ...progressChanges.filter((change) => change.toStatus === "COMPLETED" && change.effectiveOn).map((change) => ({
      id: change.id, date: dateString(change.effectiveOn!), kind: "Completed", title: change.learningItem?.title ?? change.lesson?.title ?? change.topic?.title ?? change.song?.title ?? change.songSection?.title ?? "Learning progress",
    })),
  ]).slice(0, 30);
  const loginDates = [...new Set(loginDays.map(({ firstLoginAt }) => localCalendarDateAt(firstLoginAt, profile.timezoneName)))];
  const streak = calculateStreak(loginDates, today);
  const practiceSeries = practiceDates.map((row) => ({ practicedOn: dateString(row.practicedOn), durationMinutes: row.durationMinutes }));
  const goalCompletionSeries = periods.slice(0, 12).reverse().map((period) => {
    const main = period.goals.filter((goal) => goal.kind === "MAIN");
    return { period: `Week ${period.sequenceNo}`, percent: main.length ? Math.round(main.filter((goal) => goal.status === "COMPLETED").length * 100 / main.length) : 0 };
  });
  return {
    timezoneName: profile.timezoneName, today, activePeriod, periods: periods.slice(0, 12), unfinishedPreviousGoals,
    practiceCount: practice._count.id, durations, practiceDaysThisMonth: datesThisMonth.size,
    completedLessons: lessons, completedLearningItems: items, completedSongs: songs,
    categoryTotals: [...categoryTotals].sort((a, b) => b.minutes - a.minutes), ratedCategories,
    reviewCycles: cycles, currentStreak: streak.currentStreak, longestStreak: streak.longestStreak,
    awards, milestones, timeline, practiceDates, loginDates: loginDates.sort().reverse().slice(0, 90),
    dailyPracticeChart: dailyPracticeSeries(practiceSeries, today),
    weeklyPracticeChart: weeklyPracticeSeries(practiceSeries, today),
    monthlyPracticeChart: monthlyPracticeSeries(practiceSeries, today),
    yearlyPracticeChart: yearlyPracticeSeries(allPracticeDates.map((row) => ({ practicedOn: dateString(row.practicedOn), durationMinutes: row.durationMinutes })), today),
    goalCompletionSeries,
  };
}

export async function calendarData(prisma: PrismaClient, year: number, month: number) {
  const from = new Date(Date.UTC(year, month - 1, 1));
  const to = new Date(Date.UTC(year, month, 1));
  const [practice, periods] = await Promise.all([
    prisma.practiceRecord.findMany({ where: { practicedOn: { gte: from, lt: to } }, select: { practicedOn: true, durationMinutes: true, id: true } }),
    prisma.weeklyPeriod.findMany({ where: { startOn: { lt: to } }, include: { goals: true }, orderBy: { startOn: "desc" } }),
  ]);
  const practiceByDay = new Map<string, { minutes: number; count: number }>();
  for (const record of practice) {
    const key = dateString(record.practicedOn);
    const previous = practiceByDay.get(key) ?? { minutes: 0, count: 0 };
    practiceByDay.set(key, { minutes: previous.minutes + record.durationMinutes, count: previous.count + 1 });
  }
  return { year, month, practiceByDay: Object.fromEntries(practiceByDay), periods };
}
