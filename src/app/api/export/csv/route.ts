import { NextResponse } from "next/server";
import { getPrismaClient } from "@/infrastructure/database/prisma";
import { exportAllData, buildCsvEntries } from "@/infrastructure/product/export-repository";
import { createCsvZip } from "@/infrastructure/product/zip";
export const runtime = "nodejs";
export async function GET() {
  try {
    const data = await exportAllData(getPrismaClient());
    const archive = createCsvZip(buildCsvEntries(data));
    return new NextResponse(new Uint8Array(archive), { headers: {
      "Content-Type": "application/zip", "Content-Disposition": "attachment; filename=piano-learning-csv-export.zip", "Cache-Control": "no-store",
    } });
  } catch { return NextResponse.json({ error: "The export could not be prepared." }, { status: 503 }); }
}
