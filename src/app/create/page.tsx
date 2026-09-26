import Link from "next/link";
import { PageTitle } from "@/app/workflows/components";

const flows = [
  { title: "Main Topic", copy: "Add something new you would like to learn.", href: "/create/main-topic", icon: "✳" },
  { title: "Subtopic", copy: "Break a Main Topic into a smaller step.", href: "/create/subtopic", icon: "⌁" },
  { title: "Weekly Plan", copy: "Choose what matters to you this week.", href: "/create/weekly-plan", icon: "▦" },
  { title: "Song", copy: "Add a piece to your repertoire.", href: "/create/song", icon: "♫" },
  { title: "Personal Goal", copy: "Keep a longer-term intention in view.", href: "/create/personal-goal", icon: "✧" },
];

export default function CreatePage() {
  return <>
    <PageTitle title="Create" description="What would you like to add to your piano journey?" />
    <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {flows.map((flow, index) => <Link key={flow.href} href={flow.href} className="create-choice animate-float-in" style={{ animationDelay: `${index * 45}ms` }}>
        <span className="create-choice-icon" aria-hidden="true">{flow.icon}</span>
        <span><span className="create-choice-title block">{flow.title}</span><span className="create-choice-copy block">{flow.copy}</span></span>
        <span className="create-choice-arrow" aria-hidden="true">↗</span>
      </Link>)}
    </div>
    <p className="pl-1 text-sm text-stone-500">Need a category? You can add one from <Link className="underline" href="/learn">Learn</Link>.</p>
  </>;
}
