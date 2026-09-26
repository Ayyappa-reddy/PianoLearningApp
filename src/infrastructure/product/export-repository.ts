import "server-only";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { csvCell } from "@/domain/analytics";
import { getOrCreateOwnerProfile } from "./profile-repository";

type Dataset = { name: string; rows: Array<Record<string, unknown>> };

export async function exportAllData(prisma: PrismaClient) {
  return prisma.$transaction(async (tx) => {
    const [profile, categories, learningItems, lessons, topics, prerequisites, songs, songSections, weeklyPeriods,
      weeklyGoals, weeklyGoalStatusChanges, learningProgressChanges, personalGoals, practiceRecords,
      weeklyGoalPracticeRecords, goalCarryForwards, goalCarryForwardEvents, reviewCycles, reviews,
      reviewEntries, loginDays, achievementDefinitions, awardedAchievements, milestones] = await Promise.all([
      tx.ownerProfile.findMany(), tx.category.findMany(), tx.learningItem.findMany(), tx.lesson.findMany(),
      tx.topic.findMany(), tx.learningPrerequisite.findMany(), tx.song.findMany(), tx.songSection.findMany(),
      tx.weeklyPeriod.findMany(), tx.weeklyGoal.findMany(), tx.weeklyGoalStatusChange.findMany(),
      tx.learningProgressChange.findMany(), tx.personalGoal.findMany(), tx.practiceRecord.findMany(),
      tx.weeklyGoalPracticeRecord.findMany(), tx.goalCarryForward.findMany(), tx.goalCarryForwardEvent.findMany(),
      tx.reviewCycle.findMany(), tx.review.findMany(), tx.reviewEntry.findMany(), tx.loginDay.findMany(),
      tx.achievementDefinition.findMany(), tx.awardedAchievement.findMany(), tx.milestone.findMany(),
    ]);
    const owner = profile[0] ?? await getOrCreateOwnerProfile(tx);
    const data = {
      categories, learningItems, lessons, topics, learningPrerequisites: prerequisites, songs, songSections,
      weeklyPeriods, weeklyGoals, weeklyGoalStatusChanges, learningProgressChanges, personalGoals,
      practiceRecords, weeklyGoalPracticeRecords, goalCarryForwards, goalCarryForwardEvents,
      reviewCycles, reviews, reviewEntries, loginDays, achievementDefinitions, awardedAchievements, milestones,
    };
    return { formatVersion: 1, exportedAt: new Date().toISOString(), timezone: owner.timezoneName, ownerProfile: owner, ...data };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}

function snakeCase(value: string) { return value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`); }

export function buildCsvDatasets(data: Record<string, unknown>): Dataset[] {
  const entries = Object.entries(data).filter(([name]) => !["formatVersion", "exportedAt", "timezone"].includes(name));
  entries.push(["ownerProfile", data.ownerProfile]);
  entries.push(["exportMetadata", { formatVersion: data.formatVersion, exportedAt: data.exportedAt, timezone: data.timezone }]);
  return entries.flatMap(([name, value]) => {
    if (value === null || value === undefined) return [];
    const rows = (Array.isArray(value) ? value : [value]) as Array<Record<string, unknown>>;
    const keys = rows.length ? Object.keys(rows[0]) : ["id"];
    const headers = keys.map(snakeCase);
    const content = [headers.map(csvCell).join(","), ...rows.map((row) => keys.map((key) => csvCell(row[key])).join(","))].join("\r\n");
    return [{ name: `${snakeCase(name)}.csv`, rows: [{ __content: content }] }];
  });
}

export function buildCsvEntries(data: Record<string, unknown>): Array<{ name: string; content: string }> {
  return buildCsvDatasets(data).map((dataset) => ({ name: dataset.name, content: String(dataset.rows[0]?.__content ?? "") }));
}
