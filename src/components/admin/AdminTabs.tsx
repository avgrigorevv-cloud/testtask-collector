"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin", label: "Задания" },
  { href: "/admin/captures", label: "Скриншоты" },
];

// Pill-shaped switcher between the two sections of the admin panel.
export function AdminTabs() {
  const pathname = usePathname();
  const onCaptures = pathname.startsWith("/admin/captures");

  return (
    <nav
      aria-label="Разделы админки"
      className="inline-flex items-center gap-1 rounded-full border border-line bg-white p-1 shadow-sm"
    >
      {TABS.map((tab) => {
        const active = tab.href === "/admin/captures" ? onCaptures : !onCaptures;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-full px-5 py-1.5 text-sm font-medium transition-colors ${
              active
                ? "bg-slate-100 text-foreground shadow-inner"
                : "text-muted hover:text-foreground"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
