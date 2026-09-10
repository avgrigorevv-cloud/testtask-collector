"use client";

import { useEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";

export function DropdownMenu({
  trigger,
  triggerClassName,
  panelClassName,
  ariaLabel = "Дополнительные действия",
  children,
}: {
  trigger?: React.ReactNode;
  triggerClassName?: string;
  panelClassName?: string;
  ariaLabel?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={(e) => {
          e.preventDefault();
          setOpen((v) => !v);
        }}
        className={
          triggerClassName ??
          "flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-black/5 hover:text-foreground"
        }
      >
        {trigger ?? <MoreHorizontal className="h-4 w-4" />}
      </button>
      {open && (
        <div
          role="menu"
          onClick={() => setOpen(false)}
          className={`menu-surface absolute right-0 top-full z-20 mt-1 overflow-hidden rounded-xl py-1 shadow-lg ${
            panelClassName ?? "w-44"
          }`}
        >
          {children}
        </div>
      )}
    </div>
  );
}
