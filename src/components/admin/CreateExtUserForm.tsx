"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const inputClass =
  "w-full rounded-xl border border-line bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent";

export function CreateExtUserForm() {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch("/api/admin/ext-users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login, password }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Не удалось создать логин");
      return;
    }
    setLogin("");
    setPassword("");
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-line bg-white p-5 shadow-sm space-y-3"
    >
      <h2 className="text-base font-semibold text-foreground">Новый логин для расширения</h2>
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <input
          value={login}
          onChange={(e) => setLogin(e.target.value)}
          placeholder="Логин, например ivanov"
          autoComplete="off"
          className={inputClass}
        />
        <input
          type="text"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Пароль, от 8 символов"
          autoComplete="new-password"
          className={inputClass}
        />
        <button
          type="submit"
          disabled={saving || !login || !password}
          className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white shadow-[0_8px_20px_var(--accent-glow)] transition hover:bg-accent-deep disabled:opacity-50 whitespace-nowrap"
        >
          {saving ? "Создание..." : "+ Создать"}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <p className="text-xs text-muted">
        Логин и пароль передайте сотруднику: он введет их в расширении. Скриншоты будут
        складываться в его папку.
      </p>
    </form>
  );
}
