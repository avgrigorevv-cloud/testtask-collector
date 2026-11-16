import { notFound } from "next/navigation";
import { Download, ExternalLink } from "lucide-react";
import { prisma } from "@/lib/prisma";
import type { Pin } from "@/lib/blocks";
import { ImageAnnotate } from "@/components/shared/ImageAnnotate";
import { BackLink } from "@/components/admin/BackLink";
import { isAbsoluteHttpUrl } from "@/lib/captures";

export const dynamic = "force-dynamic";

export default async function CaptureDetailPage({
  params,
}: {
  params: Promise<{ userId: string; captureId: string }>;
}) {
  const { userId, captureId } = await params;
  const capture = await prisma.capture.findUnique({
    where: { id: captureId },
    include: { user: true },
  });
  if (!capture || capture.userId !== userId) notFound();

  const pins = JSON.parse(capture.pins) as Pin[];
  const imageUrl = `/api/files/captures/${capture.id}`;

  return (
    <div className="space-y-6">
      <div>
        <BackLink href={`/admin/captures/${capture.userId}`}>{capture.user.login}</BackLink>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-foreground break-words">
              {capture.pageTitle || "Без заголовка"}
            </h1>
            {isAbsoluteHttpUrl(capture.pageUrl) ? (
              <a
                href={capture.pageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex max-w-full items-center gap-1 text-sm text-accent hover:underline"
              >
                <span className="truncate">{capture.pageUrl}</span>
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              </a>
            ) : (
              <p className="mt-1 text-sm text-muted break-all">{capture.pageUrl}</p>
            )}
            <p className="text-xs text-slate-400 mt-1">
              {new Date(capture.createdAt).toLocaleString("ru-RU")}
              {capture.viewportWidth &&
                capture.viewportHeight &&
                ` · окно ${capture.viewportWidth}×${capture.viewportHeight}`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {capture.annotatedFile && (
              <a
                href={`${imageUrl}?variant=annotated&download=1`}
                className="inline-flex items-center gap-2 rounded-xl bg-accent px-3 py-2 text-sm font-medium text-white transition hover:bg-accent-deep"
              >
                <Download className="h-4 w-4" />
                С метками
              </a>
            )}
            <a
              href={`${imageUrl}?download=1`}
              className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
              {capture.annotatedFile ? "Оригинал" : "Скачать"}
            </a>
          </div>
        </div>
      </div>

      {capture.note && (
        <div className="rounded-2xl border border-line bg-white p-5">
          <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">Общий комментарий</p>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{capture.note}</p>
        </div>
      )}

      <div className="rounded-2xl border border-line bg-white p-5">
        <ImageAnnotate images={[{ url: imageUrl }]} pins={pins} readOnly />
      </div>
    </div>
  );
}
