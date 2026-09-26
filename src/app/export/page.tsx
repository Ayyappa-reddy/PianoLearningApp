import Link from "next/link";
import { PageTitle, Panel } from "@/app/workflows/components";
export default function ExportPage() {
  return <><PageTitle title="Export your data" description="Download a point-in-time export of your personal learning history."/><Panel title="Export formats"><ul className="list-disc space-y-2 pl-6"><li><Link className="underline" href="/api/export/json">Download complete JSON export</Link></li><li><Link className="underline" href="/api/export/csv">Download CSV datasets (ZIP)</Link></li></ul></Panel></>;
}
