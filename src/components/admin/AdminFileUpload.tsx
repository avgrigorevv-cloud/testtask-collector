"use client";

import { useRef, useState } from "react";

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
    <div>
      <input
        ref={inputRef}
        type="file"
        multiple={multiple}
        onChange={handleChange}
        className="text-xs text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-medium hover:file:bg-slate-200"
      />
      {uploading && <p className="text-xs text-slate-400 mt-1">{label ?? "Загрузка..."}</p>}
    </div>
  );
}
