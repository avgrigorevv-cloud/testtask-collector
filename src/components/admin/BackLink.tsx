"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function BackLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick?: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="group inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
    >
      <span className="flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-slate-500 shadow-sm group-hover:bg-slate-900 group-hover:text-white group-hover:shadow transition-all">
        <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
      </span>
      <span className="truncate">{children}</span>
    </Link>
  );
}
