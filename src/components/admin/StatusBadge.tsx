import { CheckCircle2 } from "lucide-react";

export function StatusBadge({ status }: { status: string }) {
  if (status === "submitted") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700">
        <CheckCircle2 className="w-3.5 h-3.5" />
        Ответ получен
      </span>
    );
  }

  if (status === "opened") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-accent2-soft text-accent2-strong">
        <span className="relative flex w-2 h-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent2-strong opacity-60" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-accent2-strong" />
        </span>
        В работе
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">
      Не открыто
    </span>
  );
}
