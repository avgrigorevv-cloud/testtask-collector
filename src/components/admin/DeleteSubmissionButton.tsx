"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export function DeleteSubmissionButton({
  submissionId,
  candidateName,
}: {
  submissionId: string;
  candidateName: string;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Удалить прохождение «${candidateName}»? Это действие необратимо`)) {
      return;
    }
    setDeleting(true);
    await fetch(`/api/admin/submissions/${submissionId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      title="Удалить"
      className="flex items-center justify-center w-8 h-8 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  );
}
