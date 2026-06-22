"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wordmark } from "@/components/Logo";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: "grid" },
  { href: "/catalog", label: "Parts Catalog", icon: "search" },
  { href: "/quotes", label: "Quotes & RFQ", icon: "quote" },
  { href: "/orders", label: "Orders", icon: "box" },
  { href: "/aog", label: "AOG Desk", icon: "bolt" },
  { href: "/account", label: "Account", icon: "user" },
];

function Icon({ name }: { name: string }) {
  const common = "h-[18px] w-[18px]";
  switch (name) {
    case "grid":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common} stroke="currentColor" strokeWidth="1.8">
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      );
    case "search":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common} stroke="currentColor" strokeWidth="1.8">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.2-3.2" strokeLinecap="round" />
        </svg>
      );
    case "quote":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common} stroke="currentColor" strokeWidth="1.8">
          <path d="M4 5h16M4 10h16M4 15h10" strokeLinecap="round" />
          <path d="M14 19l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "box":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common} stroke="currentColor" strokeWidth="1.8">
          <path d="M3 7.5 12 3l9 4.5v9L12 21 3 16.5z" strokeLinejoin="round" />
          <path d="M3 7.5 12 12l9-4.5M12 12v9" />
        </svg>
      );
    case "bolt":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common} stroke="currentColor" strokeWidth="1.8">
          <path d="M13 2 4 14h6l-1 8 9-12h-6z" strokeLinejoin="round" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={common} stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4 4-6 8-6s8 2 8 6" strokeLinecap="round" />
        </svg>
      );
  }
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col bg-brand-950 lg:flex">
      <div className="flex h-16 items-center border-b border-white/10 px-5">
        <Link href="/dashboard">
          <Wordmark light />
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {nav.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-white/10 text-white"
                  : "text-brand-200 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon name={item.icon} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="m-3 rounded-lg bg-red-500/10 p-3 ring-1 ring-red-400/30">
        <div className="flex items-center gap-2 text-sm font-semibold text-red-300">
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-400" />
          AOG support 24/7
        </div>
        <p className="mt-1 text-xs text-brand-200">
          Aircraft on ground? Priority desk responds in under 20 minutes.
        </p>
        <Link
          href="/aog"
          className="mt-2 inline-flex rounded-md bg-red-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-400"
        >
          Open AOG request
        </Link>
      </div>
    </aside>
  );
}
