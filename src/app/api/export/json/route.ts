import { NextResponse } from "next/server";
import { getPrismaClient } from "@/infrastructure/database/prisma";
import { exportAllData } from "@/infrastructure/product/export-repository";
export const runtime = "nodejs";
export async function GET() {
  try {
    const data = await exportAllData(getPrismaClient());
    return new NextResponse(JSON.stringify(data, null, 2), { headers: {
      "Content-Type": "application/json; charset=utf-8", "Content-Disposition": "attachment; filename=piano-learning-export.json", "Cache-Control": "no-store",
    } });
  } catch { return NextResponse.json({ error: "The export could not be prepared." }, { status: 503 }); }
}
