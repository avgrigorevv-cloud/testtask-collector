"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BLOCK_TYPE_LABELS,
  DISPLAY_BLOCK_TYPES,
  INPUT_BLOCK_TYPES,
  newBlock,
  type Block,
  type BlockType,
} from "@/lib/blocks";
import { BlockEditorCard } from "@/components/admin/BlockEditorCard";

export type TemplateBuilderInitial = {
  id?: string;
  name: string;
  roleLabel: string;
  description: string;
  blocks: Block[];
};

export function TemplateBuilder({
  initial,
  title,
}: {
  initial: TemplateBuilderInitial;
  title: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [roleLabel, setRoleLabel] = useState(initial.roleLabel);
  const [description, setDescription] = useState(initial.description);
  const [blocks, setBlocks] = useState<Block[]>(initial.blocks);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const savedIdRef = useRef<string | undefined>(initial.id);
  const skipDirtyCheck = useRef(true);

  useEffect(() => {
    if (skipDirtyCheck.current) {
      skipDirtyCheck.current = false;
      return;
    }
    setDirty(true);
  }, [name, roleLabel, description, blocks]);

  function updateBlock(index: number, block: Block) {
    setBlocks((prev) => prev.map((b, i) => (i === index ? block : b)));
  }

  function removeBlock(index: number) {
    setBlocks((prev) => prev.filter((_, i) => i !== index));
  }

  function moveBlock(index: number, direction: -1 | 1) {
    setBlocks((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function addBlock(type: BlockType) {
    setBlocks((prev) => [...prev, newBlock(type)]);
  }

  async function saveTemplate(): Promise<boolean> {
    if (!name.trim() || !roleLabel.trim()) {
      setError("Укажите название шаблона и роль");
      return false;
    }
    setSaving(true);
    setError(null);

    const payload = { name, roleLabel, description, blocks };
    const res = await fetch(
      savedIdRef.current
        ? `/api/admin/templates/${savedIdRef.current}`
        : "/api/admin/templates",
      {
        method: savedIdRef.current ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    setSaving(false);
    if (!res.ok) {
      setError("Не удалось сохранить шаблон");
      return false;
    }
    const data = await res.json();
    savedIdRef.current = data.id ?? savedIdRef.current;
    setDirty(false);
    return true;
  }

  async function handleSaveClick() {
    const ok = await saveTemplate();
    if (ok) {
      router.push(`/admin/templates/${savedIdRef.current}`);
      router.refresh();
    }
  }

  function guardNav(e: React.MouseEvent, href: string, newTab?: boolean) {
    if (!dirty) return;
    e.preventDefault();

    const wantsSave = confirm(
      "В шаблоне есть несохранённые изменения. Сохранить перед переходом?"
    );

    if (!wantsSave) {
      if (newTab) window.open(href, "_blank");
      else router.push(href);
      return;
    }

    const pendingWin = newTab ? window.open("", "_blank") : null;
    saveTemplate().then(() => {
      if (newTab) {
        if (pendingWin) pendingWin.location.href = href;
      } else {
        router.push(href);
        router.refresh();
      }
    });
  }

  const templatesHref = "/admin";
  const previewHref = initial.id ? `/admin/templates/${initial.id}/preview` : "";
  const submissionsHref = initial.id
    ? `/admin/templates/${initial.id}/submissions`
    : "";

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={templatesHref}
          onClick={(e) => guardNav(e, templatesHref)}
          className="text-sm text-slate-500 hover:text-slate-900"
        >
          ← Шаблоны
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        {initial.id && (
          <div className="flex items-center gap-2">
            <Link
              href={previewHref}
              target="_blank"
              onClick={(e) => guardNav(e, previewHref, true)}
              className="rounded-lg bg-slate-100 text-slate-700 px-4 py-2 text-sm font-medium hover:bg-slate-200"
            >
              Предпросмотр
            </Link>
            <Link
              href={submissionsHref}
              onClick={(e) => guardNav(e, submissionsHref)}
              className="rounded-lg bg-slate-900 text-white px-4 py-2 text-sm font-medium hover:bg-slate-800"
            >
              Прохождения →
            </Link>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Название шаблона, например «Backend-стажёр»"
          className="w-full text-lg font-medium rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900"
        />
        <input
          value={roleLabel}
          onChange={(e) => setRoleLabel(e.target.value)}
          placeholder="Роль, например «Стажёр-разработчик»"
          className="w-full text-sm rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Короткое описание задания для кандидата"
          rows={2}
          className="w-full text-sm rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900"
        />
      </div>

      <div className="space-y-3">
        {blocks.map((block, index) => (
          <BlockEditorCard
            key={block.id}
            block={block}
            onChange={(b) => updateBlock(index, b)}
            onRemove={() => removeBlock(index)}
            onMoveUp={() => moveBlock(index, -1)}
            onMoveDown={() => moveBlock(index, 1)}
            isFirst={index === 0}
            isLast={index === blocks.length - 1}
          />
        ))}
        {blocks.length === 0 && (
          <p className="text-sm text-slate-400">Добавьте первый блок ниже.</p>
        )}
      </div>

      <div className="rounded-xl border border-dashed border-slate-300 p-4">
        <p className="text-xs uppercase tracking-wide text-slate-400 mb-2">
          Добавить блок
        </p>
        <div className="flex flex-wrap gap-2">
          {DISPLAY_BLOCK_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => addBlock(type)}
              className="rounded-lg bg-slate-100 hover:bg-slate-200 px-3 py-1.5 text-sm"
            >
              + {BLOCK_TYPE_LABELS[type]}
            </button>
          ))}
          {INPUT_BLOCK_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => addBlock(type)}
              className="rounded-lg bg-slate-100 hover:bg-slate-200 px-3 py-1.5 text-sm"
            >
              + {BLOCK_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        onClick={handleSaveClick}
        disabled={saving}
        className="rounded-lg bg-slate-900 text-white px-5 py-2.5 text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
      >
        {saving ? "Сохранение..." : dirty ? "Сохранить изменения" : "Сохранено"}
      </button>
    </div>
  );
}
