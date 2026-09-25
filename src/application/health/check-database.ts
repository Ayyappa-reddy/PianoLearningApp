import { getPrismaClient } from "@/infrastructure/database/prisma";

export type DatabaseHealth = { status: "available" } | { status: "unavailable" };

export async function checkDatabase(): Promise<DatabaseHealth> {
  if (!process.env.DATABASE_URL) return { status: "unavailable" };

  try {
    await getPrismaClient().$queryRaw`SELECT 1`;
    return { status: "available" };
  } catch {
    return { status: "unavailable" };
  }
}
