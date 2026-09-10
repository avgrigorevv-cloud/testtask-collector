"use client";

import { useEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";

export function DropdownMenu({
  trigger,
  triggerClassName,
  panelClassName,
  ariaLabel = "Дополнительные действия",
  inline = false,
  closeOnItemClick = true,
  children,
}: {
  trigger?: React.ReactNode;
  triggerClassName?: string;
  panelClassName?: string;
  ariaLabel?: string;
  /** Render the panel in normal flow below the trigger (pushing content down)
   * instead of as an absolutely-positioned overlay. Use this when the
   * trigger's own container has nothing beside it that an overlay would
   * cover, and overlaying other content instead would be the problem. */
  inline?: boolean;
  closeOnItemClick?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || inline) return;

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
  }, [open, inline]);

  return (
    <div ref={ref} className={inline ? undefined : "relative"}>
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
          onClick={closeOnItemClick ? () => setOpen(false) : undefined}
          className={
            inline
              ? `mt-2 overflow-hidden rounded-xl border border-line ${panelClassName ?? ""}`
              : `menu-surface absolute right-0 top-full z-20 mt-1 overflow-hidden rounded-xl py-1 shadow-lg ${
                  panelClassName ?? "w-44"
                }`
          }
        >
          {children}
        </div>
      )}
    </div>
  );
}
