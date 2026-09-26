import { NextResponse } from "next/server";
import { getPrismaClient } from "@/infrastructure/database/prisma";
import { recordLoginDay } from "@/infrastructure/product/login-repository";
export const runtime = "nodejs";
export async function POST() {
  try { await recordLoginDay(getPrismaClient()); return NextResponse.json({ recorded: true }, { status: 200, headers: { "Cache-Control": "no-store" } }); }
  catch { return NextResponse.json({ error: "Daily activity could not be recorded." }, { status: 503 }); }
}
