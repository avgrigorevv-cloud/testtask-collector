import Link from "next/link";
import { LogoutButton } from "@/components/admin/LogoutButton";

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-background">
      <div className="bg-blobs">
        <div className="blob blob-a" />
        <div className="blob blob-b" />
      </div>
      <header className="sticky top-0 z-10 border-b border-line bg-white/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/admin" className="font-semibold text-foreground tracking-tight">
            Тестовые задания <span className="text-muted">·</span> Admin panel
          </Link>
          <LogoutButton />
        </div>
      </header>
      <main className="relative max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
