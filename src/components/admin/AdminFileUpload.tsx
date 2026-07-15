"use client";

import { useId, useRef, useState } from "react";

type UploadedFile = { url: string; name: string };

export function AdminFileUpload({
  multiple,
  label,
  onUploaded,
}: {
  multiple?: boolean;
  label?: string;
  onUploaded: (files: UploadedFile[]) => void;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    const uploaded: UploadedFile[] = [];
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      if (res.ok) uploaded.push(await res.json());
    }
    setUploading(false);
    onUploaded(uploaded);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor={inputId}
        className="cursor-pointer rounded-md bg-slate-100 hover:bg-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700"
      >
        Выбрать файлы
      </label>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        multiple={multiple}
        onChange={handleChange}
        className="sr-only"
      />
      {uploading && (
        <span className="text-xs text-slate-400">{label ?? "Загрузка..."}</span>
      )}
    </div>
  );
}
