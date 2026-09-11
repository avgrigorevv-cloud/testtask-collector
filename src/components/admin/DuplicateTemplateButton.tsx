"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DuplicateTemplateButton({ templateId }: { templateId: string }) {
  const router = useRouter();
  const [duplicating, setDuplicating] = useState(false);

  async function handleDuplicate(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDuplicating(true);
    const res = await fetch(`/api/admin/templates/${templateId}/duplicate`, {
      method: "POST",
    });
    setDuplicating(false);
    if (res.ok) router.refresh();
  }

  return (
    <button
      onClick={handleDuplicate}
      disabled={duplicating}
      className="w-full px-3 py-2 text-left text-sm text-foreground transition hover:bg-black/5 disabled:opacity-50"
    >
      {duplicating ? "Дублирование..." : "Дублировать"}
    </button>
  );
}
