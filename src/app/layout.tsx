import type { Metadata } from "next";
import { DailyAccessTracker } from "./DailyAccessTracker";
import { AppNavigation } from "./AppNavigation";
import "./globals.css";

export const metadata: Metadata = {
  title: "Piano Learning Progress",
  description: "A personal record of your piano-learning journey.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="app-frame">
          <AppNavigation />
          <div className="app-main">
            <main className="page-content">{children}</main>
          </div>
          <DailyAccessTracker />
        </div>
      </body>
    </html>
  );
}
