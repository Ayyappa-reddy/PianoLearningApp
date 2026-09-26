"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const primary = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/this-week", label: "This Week", icon: "calendar" },
  { href: "/create", label: "Create", icon: "plus" },
  { href: "/learn", label: "Learn", icon: "book" },
  { href: "/practice", label: "Practice", icon: "piano" },
  { href: "/progress", label: "Progress", icon: "chart" },
] as const;

const secondary = [
  { href: "/songs", label: "Songs & repertoire", icon: "music" },
  { href: "/reviews", label: "Reviews", icon: "sparkle" },
  { href: "/progress#achievements", label: "Achievements", icon: "award" },
  { href: "/settings", label: "Settings", icon: "settings" },
  { href: "/export", label: "Export", icon: "download" },
] as const;

function Icon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    home: <><path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9M9 20v-6h6v6"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M16 3v4M8 3v4M3 10h18M8 14h3M8 17h7"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 0 4 22z"/><path d="M4 5.5v14A2.5 2.5 0 0 1 6.5 17H20"/></>,
    piano: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 5v8M11 5v8M15 5v8M19 5v8M7 13h4M15 13h4"/></>,
    chart: <><path d="M4 19V5M4 19h17"/><path d="m7 15 4-4 3 2 6-7"/></>,
    music: <><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></>,
    sparkle: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="m19 15 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z"/></>,
    award: <><circle cx="12" cy="8" r="5"/><path d="m8.5 12-1 9 4.5-2.8 4.5 2.8-1-9"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.2 2.1-2 2-2.1-1.2-.2.1-2.4 1v2.4h-3v-2.4l-2.4-1-.2-.1-2.1 1.2-2-2 1.2-2.1-.1-.2-1-2.4H2v-3h2.4l1-2.4.1-.2-1.2-2.1 2-2 2.1 1.2.2-.1 2.4-1V2h3v2.4l2.4 1 .2.1 2.1-1.2 2 2-1.2 2.1.1.2 1 2.4H22v3h-2.4z" transform="translate(0 1) scale(.92)"/></>,
    download: <><path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 17v3h16v-3"/></>,
    more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] ?? paths.sparkle}</svg>;
}

function Brand() {
  return <Link href="/" className="app-brand">
    <span className="brand-mark"><Icon name="piano" /></span>
    <span><span className="brand-title">Piano Daybook</span><span className="brand-caption">your learning space</span></span>
  </Link>;
}

function isActive(pathname: string, href: string) {
  const path = href.split("#")[0];
  if (path === "/") return pathname === "/";
  if (path === "/learn") return pathname.startsWith("/learn") || pathname.startsWith("/catalog");
  return pathname === path || pathname.startsWith(`${path}/`);
}

export function AppNavigation() {
  const pathname = usePathname();
  const renderLink = (item: (typeof primary)[number] | (typeof secondary)[number], mobile = false) => {
    const active = isActive(pathname, item.href);
    return <Link key={item.href} href={item.href} className={mobile ? "mobile-tab-link" : "nav-link"} data-active={active} data-create={item.icon === "plus" || undefined} aria-label={item.label} aria-current={active ? "page" : undefined} title={item.label}>
      <Icon name={item.icon} /><span>{mobile && item.label === "This Week" ? "Week" : item.label}</span>
    </Link>;
  };

  return <>
    <aside className="app-sidebar">
      <Brand />
      <nav aria-label="Main navigation" className="side-nav">{primary.map(item => renderLink(item))}</nav>
      <div className="sidebar-tools">
        <Link href="/settings" className="nav-link" aria-label="Settings" title="Settings" data-active={isActive(pathname, "/settings")}><Icon name="settings" /><span>Settings</span></Link>
        <details className="desktop-more">
          <summary aria-label="More sections" title="More"><Icon name="more" /></summary>
          <nav aria-label="More navigation">{secondary.filter(item => item.href !== "/settings").map(item => <Link key={item.href} href={item.href}><Icon name={item.icon}/><span>{item.label}</span></Link>)}</nav>
        </details>
      </div>
    </aside>

    <header className="mobile-header">
      <Brand />
      <details className="mobile-more"><summary aria-label="More"><Icon name="more" /></summary>
        <nav aria-label="More navigation">{secondary.map(item => <Link key={item.href} href={item.href}>{item.label}</Link>)}</nav>
      </details>
    </header>

    <nav aria-label="Main navigation" className="mobile-tabbar">{primary.map(item => renderLink(item, true))}</nav>
  </>;
}
