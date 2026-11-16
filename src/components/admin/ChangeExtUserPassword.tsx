"use client";

import { useState } from "react";

export function ChangeExtUserPassword({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const res = await fetch(`/api/admin/ext-users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setMessage({ ok: false, text: body.error ?? "Не удалось сменить пароль" });
      return;
    }
    setPassword("");
    setMessage({ ok: true, text: "Пароль изменен, расширение попросит войти заново" });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-xl border border-line bg-white px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
      >
        Сменить пароль
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
      <input
        type="text"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Новый пароль"
        autoComplete="new-password"
        className="rounded-xl border border-line bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
      />
      <button
        type="submit"
        disabled={saving || !password}
        className="rounded-xl bg-accent px-3 py-2 text-sm font-medium text-white transition hover:bg-accent-deep disabled:opacity-50"
      >
        {saving ? "..." : "Сохранить"}
      </button>
      {message && (
        <span className={`text-sm ${message.ok ? "text-emerald-600" : "text-red-600"}`}>
          {message.text}
        </span>
      )}
    </form>
  );
}
