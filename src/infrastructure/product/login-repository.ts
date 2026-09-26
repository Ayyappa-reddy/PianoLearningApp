import "server-only";
import type { PrismaClient } from "@/generated/prisma/client";
import { localCalendarDateAt } from "@/domain/streak";
import { parseDateOnly } from "@/domain/product";
import { getOrCreateOwnerProfile } from "./profile-repository";

export async function recordLoginDay(prisma: PrismaClient, instant = new Date()) {
  const profile = await getOrCreateOwnerProfile(prisma);
  const localDate = localCalendarDateAt(instant, profile.timezoneName);
  return prisma.loginDay.upsert({
    where: { localDate: parseDateOnly(localDate) },
    create: { localDate: parseDateOnly(localDate), timezoneName: profile.timezoneName, firstLoginAt: instant, lastLoginAt: instant },
    update: { lastLoginAt: instant },
  });
}

export async function listLoginHistory(prisma: PrismaClient) {
  const [profile, days] = await Promise.all([
    getOrCreateOwnerProfile(prisma), prisma.loginDay.findMany({ orderBy: { localDate: "desc" } }),
  ]);
  return { profile, days };
}
