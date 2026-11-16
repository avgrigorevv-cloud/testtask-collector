import Link from "next/link";
import { Folder } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { CreateExtUserForm } from "@/components/admin/CreateExtUserForm";
import { pluralize } from "@/lib/captures";

export const dynamic = "force-dynamic";

// One "folder" per extension login.
export default async function CapturesFoldersPage() {
  const users = await prisma.extUser.findMany({
    orderBy: { login: "asc" },
    include: {
      _count: { select: { captures: true } },
      captures: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Скриншоты из расширения</h1>
        <p className="text-sm text-muted mt-2">
          У каждого логина своя папка. Скриншоты с метками попадают сюда из браузерного расширения.
        </p>
      </div>

      <CreateExtUserForm />

      {users.length === 0 ? (
        <div className="rounded-3xl border border-line bg-white px-6 py-12 text-center text-sm text-muted">
          Пока нет ни одного логина. Создайте первый выше.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {users.map((u) => (
            <Link
              key={u.id}
              href={`/admin/captures/${u.id}`}
              className="flex items-center gap-4 rounded-3xl border border-line bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-soft">
                <Folder className="h-5 w-5 text-accent-strong" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">{u.login}</p>
                <p className="text-xs text-muted">
                  {u._count.captures}{" "}
                  {pluralize(u._count.captures, "скриншот", "скриншота", "скриншотов")}
                  {u.captures[0] &&
                    ` · последний ${new Date(u.captures[0].createdAt).toLocaleDateString("ru-RU")}`}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
