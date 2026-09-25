import { NextResponse } from "next/server";
import { checkDatabase } from "@/application/health/check-database";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const database = await checkDatabase();
  const healthy = database.status === "available";

  return NextResponse.json(
    { status: healthy ? "ok" : "degraded", database: database.status },
    { status: healthy ? 200 : 503 },
  );
}
