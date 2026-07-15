"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CreateSubmissionButton({ templateId }: { templateId: string }) {
  const router = useRouter();
  const [candidateName, setCandidateName] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    setCreating(true);
    await fetch(`/api/admin/templates/${templateId}/submissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidateName: candidateName || undefined }),
    });
    setCreating(false);
    setCandidateName("");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <input
        value={candidateName}
        onChange={(e) => setCandidateName(e.target.value)}
        placeholder="Имя кандидата (необязательно)"
        className="text-sm rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900"
      />
      <button
        onClick={handleCreate}
        disabled={creating}
        className="rounded-lg bg-slate-900 text-white px-4 py-2 text-sm font-medium hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap"
      >
        {creating ? "Создание..." : "+ Новая ссылка"}
      </button>
    </div>
  );
}
