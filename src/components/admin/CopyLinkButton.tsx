"use client";

import { useState } from "react";

export function CopyLinkButton({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const base =
      process.env.NEXT_PUBLIC_BASE_URL ??
      (typeof window !== "undefined" ? window.location.origin : "");
    await navigator.clipboard.writeText(`${base}${path}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      onClick={handleCopy}
      className="text-xs rounded-md border border-slate-300 px-2 py-1 hover:bg-slate-100"
    >
      {copied ? "Скопировано" : "Копировать ссылку"}
    </button>
  );
}
