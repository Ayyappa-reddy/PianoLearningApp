import type { ReactNode } from "react";

export function PageTitle({ title, description }: { title: string; description?: string }) {
  return <header className="page-title"><h1>{title}</h1>{description && <p>{description}</p>}</header>;
}
export function Panel({ title, children, id }: { title: string; children: ReactNode; id?: string }) {
  return <section id={id} className="panel-card"><h2>{title}</h2>{children}</section>;
}
export function Notice({ error, success }: { error?: string; success?: string }) {
  if (error) return <p role="alert" className="mb-5 text-sm">{error}</p>;
  return success ? <p role="status" className="mb-5 text-sm">{success}</p> : null;
}
export const inputClass = "min-w-0 rounded-xl border bg-white px-3 py-2 text-sm";
export const buttonClass = "rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-medium text-white";
export const dangerButtonClass = "rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800";
