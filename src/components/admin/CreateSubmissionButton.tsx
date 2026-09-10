"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CreateSubmissionButton({ templateId }: { templateId: string }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    setCreating(true);
    await fetch(`/api/admin/templates/${templateId}/submissions`, {
      method: "POST",
    });
    setCreating(false);
    router.refresh();
  }

  return (
    <button
      onClick={handleCreate}
      disabled={creating}
      className="rounded-xl bg-gradient-to-br from-accent to-accent-deep text-white px-4 py-2 text-sm font-medium shadow-sm transition hover:brightness-110 disabled:opacity-50 whitespace-nowrap"
    >
      {creating ? "Создание..." : "+ Новая ссылка"}
    </button>
  );
}
