import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Piano Learning Progress",
  description: "A personal record of your piano-learning journey.",
};

const navigation = [
  { href: "/", label: "Home" },
  { href: "/status", label: "System status" },
];

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen">
          <header className="border-b border-stone-200 bg-white">
            <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
              <Link href="/" className="text-lg font-semibold tracking-tight text-stone-900">
                Piano Learning Progress
              </Link>
              <nav aria-label="Main navigation" className="flex flex-wrap gap-x-5 gap-y-2">
                {navigation.map((item) => (
                  <Link key={item.href} href={item.href} className="text-sm font-medium text-stone-600 hover:text-stone-950">
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </header>
          <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">{children}</main>
        </div>
      </body>
    </html>
  );
}
