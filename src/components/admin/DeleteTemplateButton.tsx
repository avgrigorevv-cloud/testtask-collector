"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteTemplateButton({
  templateId,
  templateName,
}: {
  templateId: string;
  templateName: string;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (
      !confirm(
        `Удалить шаблон «${templateName}»? Все прохождения по нему тоже будут удалены`
      )
    ) {
      return;
    }
    setDeleting(true);
    await fetch(`/api/admin/templates/${templateId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="text-xs text-slate-400 hover:text-red-600 disabled:opacity-50"
    >
      {deleting ? "Удаление..." : "Удалить"}
    </button>
  );
}
