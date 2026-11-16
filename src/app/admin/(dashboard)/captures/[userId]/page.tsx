import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BackLink } from "@/components/admin/BackLink";
import { ChangeExtUserPassword } from "@/components/admin/ChangeExtUserPassword";
import { pluralize } from "@/lib/captures";
import { captureDayKey } from "@/lib/storage";

export const dynamic = "force-dynamic";

function formatDay(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function CaptureFolderPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const user = await prisma.extUser.findUnique({
    where: { id: userId },
    include: { captures: { orderBy: { createdAt: "desc" } } },
  });
  if (!user) notFound();

  // One group per calendar day, newest first (captures are already sorted).
  const byDay = new Map<string, typeof user.captures>();
  for (const c of user.captures) {
    const key = captureDayKey(c.createdAt);
    byDay.set(key, [...(byDay.get(key) ?? []), c]);
  }
  const groups = [...byDay.entries()];

  return (
    <div className="space-y-6">
      <div>
        <BackLink href="/admin/captures">Все папки</BackLink>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{user.login}</h1>
            <p className="text-sm text-muted mt-1">
              {user.captures.length}{" "}
              {pluralize(user.captures.length, "скриншот", "скриншота", "скриншотов")}
            </p>
          </div>
          <ChangeExtUserPassword userId={user.id} />
        </div>
      </div>

      {user.captures.length === 0 ? (
        <div className="rounded-3xl border border-line bg-white px-6 py-12 text-center text-sm text-muted">
          В папке пока пусто.
        </div>
      ) : (
        <div className="space-y-8">
        {groups.map(([day, items]) => (
          <div key={day} className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">
              {formatDay(day)} <span className="font-normal text-muted">· {items.length}</span>
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => {
            const pinsCount = (JSON.parse(c.pins) as unknown[]).length;
            return (
              <Link
                key={c.id}
                href={`/admin/captures/${user.id}/${c.id}`}
                className="group overflow-hidden rounded-3xl border border-line bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="aspect-video overflow-hidden bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/files/captures/${c.id}`}
                    alt={c.pageTitle ?? c.pageUrl}
                    loading="lazy"
                    className="h-full w-full object-cover object-top"
                  />
                </div>
                <div className="space-y-1 p-4">
                  <p className="truncate text-sm font-medium text-foreground">
                    {c.pageTitle || c.pageUrl}
                  </p>
                  <p className="truncate text-xs text-muted">{c.pageUrl}</p>
                  <p className="text-xs text-muted">
                    {new Date(c.createdAt).toLocaleString("ru-RU")} · {pinsCount}{" "}
                    {pluralize(pinsCount, "метка", "метки", "меток")}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
          </div>
        ))}
        </div>
      )}
    </div>
  );
}
