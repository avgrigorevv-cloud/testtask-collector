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
      className="w-full px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50 disabled:opacity-50"
    >
      {deleting ? "Удаление..." : "Удалить"}
    </button>
  );
}
