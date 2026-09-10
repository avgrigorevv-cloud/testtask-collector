import Link from "next/link";
import { LogoutButton } from "@/components/admin/LogoutButton";

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-black/10 bg-accent-deep">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/admin" className="font-semibold text-white tracking-tight">
            Тестовые задания <span className="text-white/50">·</span> Admin panel
          </Link>
          <LogoutButton />
        </div>
        <div className="h-[3px] bg-gradient-to-r from-accent to-accent2" />
      </header>
      <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
