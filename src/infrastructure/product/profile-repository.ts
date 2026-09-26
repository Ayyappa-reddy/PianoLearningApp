import "server-only";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { ProductError } from "@/application/product/errors";

export async function getOrCreateOwnerProfile<T extends PrismaClient | Prisma.TransactionClient>(database: T) {
  const existing = await database.ownerProfile.findFirst({ orderBy: { createdAt: "asc" } });
  if (existing) return existing;
  // The configured workspace timezone is Europe/Berlin. The Settings page lets the owner change it.
  return database.ownerProfile.create({ data: { timezoneName: "Europe/Berlin" } });
}

export async function updateOwnerTimezone(prisma: PrismaClient, timezoneName: string) {
  const current = await getOrCreateOwnerProfile(prisma);
  try { return await prisma.ownerProfile.update({ where: { id: current.id }, data: { timezoneName } }); }
  catch { throw new ProductError("NOT_FOUND", "The owner profile could not be updated."); }
}
