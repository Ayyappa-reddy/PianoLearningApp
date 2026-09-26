import Link from "next/link";
import { getPrismaClient } from "@/infrastructure/database/prisma";
import { PageTitle, Panel } from "@/app/workflows/components";
export const dynamic = "force-dynamic";
export default async function ArchivedLearnPage() {
  const db = getPrismaClient();
  const [categories, lessons, topics] = await Promise.all([
    db.category.findMany({where:{archivedAt:{not:null}},orderBy:{name:"asc"}}),
    db.lesson.findMany({where:{OR:[{archivedAt:{not:null}},{learningItem:{archivedAt:{not:null}}},{learningItem:{category:{archivedAt:{not:null}}}}]},include:{learningItem:{include:{category:true}}},orderBy:{title:"asc"}}),
    db.topic.findMany({where:{OR:[{archivedAt:{not:null}},{lesson:{archivedAt:{not:null}}},{lesson:{learningItem:{archivedAt:{not:null}}}},{lesson:{learningItem:{category:{archivedAt:{not:null}}}}}]},include:{lesson:{include:{learningItem:{include:{category:true}}}}},orderBy:{title:"asc"}}),
  ]);
  const items = await db.learningItem.findMany({where:{OR:[{archivedAt:{not:null}},{category:{archivedAt:{not:null}}}]},include:{category:true},orderBy:{title:"asc"}});
  return <><PageTitle title="Archived learning" description="Archived records stay available for historical context and are separate from active learning."/><Link className="mb-4 inline-block underline" href="/learn">Back to active learning</Link><Panel title="Categories">{categories.length ? categories.map((category)=><p key={category.id} className="border-b py-2">{category.name}</p>) : <p>No archived categories.</p>}</Panel><Panel title="Main Topics">{items.length ? items.map((item)=><p key={item.id} className="border-b py-2"><Link className="underline" href={"/catalog/items/" + item.id}>{item.title}</Link> · {item.category.name}</p>) : <p>No archived Main Topics.</p>}</Panel><Panel title="Subtopics">{lessons.length ? lessons.map((lesson)=><p key={lesson.id} className="border-b py-2"><Link className="underline" href={"/catalog/items/" + lesson.learningItemId}>{lesson.learningItem.title} → {lesson.title}</Link></p>) : <p>No archived Subtopics.</p>}</Panel><Panel title="Topics">{topics.length ? topics.map((topic)=><p key={topic.id} className="border-b py-2"><Link className="underline" href={"/catalog/lessons/" + topic.lessonId}>{topic.lesson.learningItem.title} → {topic.lesson.title} → {topic.title}</Link></p>) : <p>No archived topics.</p>}</Panel></>;
}