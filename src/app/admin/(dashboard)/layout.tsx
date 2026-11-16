import Link from "next/link";
import { AdminTabs } from "@/components/admin/AdminTabs";
import { LogoutButton } from "@/components/admin/LogoutButton";

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-background">
      <svg className="bg-pattern" aria-hidden="true">
        <defs>
          <pattern id="dot-grid" width="28" height="28" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.5" fill="currentColor" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dot-grid)" />
      </svg>
      <div className="bg-blobs">
        <div className="blob blob-a" />
        <div className="blob blob-b" />
        <div className="blob blob-c" />
      </div>
      <header className="sticky top-0 z-10 border-b border-line bg-white/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/admin" className="font-semibold text-foreground tracking-tight">
            Тестовые задания <span className="text-muted">·</span> Admin panel
          </Link>
          <AdminTabs />
          <LogoutButton />
        </div>
      </header>
      <main className="relative max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
