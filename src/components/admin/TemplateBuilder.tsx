"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  Eye,
  Image as ImageIcon,
  Info,
  Link2,
  Paperclip,
  Plus,
  Type,
  Upload,
} from "lucide-react";
import {
  BLOCK_TYPE_LABELS,
  isDisplayOnlyBlock,
  newBlock,
  type Block,
  type BlockType,
} from "@/lib/blocks";
import { BlockEditorCard } from "@/components/admin/BlockEditorCard";
import { BackLink } from "@/components/admin/BackLink";
import { DropdownMenu } from "@/components/admin/DropdownMenu";

const ADD_BLOCK_OPTIONS: {
  type: BlockType;
  icon: typeof Info;
  title: string;
  description: string;
}[] = [
  {
    type: "info",
    icon: Info,
    title: "Информация",
    description: "Покажите вводный текст без вопроса",
  },
  {
    type: "attachment",
    icon: Paperclip,
    title: "Файл-инструкция",
    description: "Прикрепите файл с описанием задания",
  },
  {
    type: "text",
    icon: Type,
    title: "Текстовый ответ",
    description: "Кандидат впишет свободный текст",
  },
  {
    type: "link",
    icon: Link2,
    title: "Ссылка",
    description: "Кандидат оставит ссылку, например на портфолио",
  },
  {
    type: "image_annotate",
    icon: ImageIcon,
    title: "Разметка скриншотов",
    description: "Кандидат отметит проблемы прямо на изображении",
  },
];

// file_upload has no entry in ADD_BLOCK_OPTIONS (it's excluded from the "add
// question" menu), but legacy blocks of that type can still exist, so the
// question nav needs a fallback icon for it.
const BLOCK_TYPE_ICONS: Record<BlockType, typeof Info> = {
  ...Object.fromEntries(ADD_BLOCK_OPTIONS.map(({ type, icon }) => [type, icon])),
  file_upload: Upload,
} as Record<BlockType, typeof Info>;

export type TemplateBuilderInitial = {
  id?: string;
  name: string;
  roleLabel: string;
  description: string;
  estimatedDuration: string;
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
  const [estimatedDuration, setEstimatedDuration] = useState(initial.estimatedDuration);
  const [blocks, setBlocks] = useState<Block[]>(initial.blocks);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const savedIdRef = useRef<string | undefined>(initial.id);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pendingScrollIdRef = useRef<string | null>(null);

  useEffect(() => {
    return () => clearTimeout(toastTimerRef.current);
  }, []);

  function scrollToBlock(id: string) {
    document.getElementById(`editor-block-${id}`)?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }

  // Scrolls to a block added via addBlock() once its card has actually
  // mounted. A ref (not state) holds the pending id so this effect never
  // needs to call setState itself.
  useEffect(() => {
    if (!pendingScrollIdRef.current) return;
    scrollToBlock(pendingScrollIdRef.current);
    pendingScrollIdRef.current = null;
  }, [blocks]);

  function updateName(value: string) {
    setName(value);
    setDirty(true);
  }

  function updateRoleLabel(value: string) {
    setRoleLabel(value);
    setDirty(true);
  }

  function updateDescription(value: string) {
    setDescription(value);
    setDirty(true);
  }

  function updateEstimatedDuration(value: string) {
    setEstimatedDuration(value);
    setDirty(true);
  }

  function updateBlock(index: number, block: Block) {
    setBlocks((prev) => prev.map((b, i) => (i === index ? block : b)));
    setDirty(true);
  }

  function removeBlock(index: number) {
    setBlocks((prev) => prev.filter((_, i) => i !== index));
    setDirty(true);
  }

  function moveBlock(index: number, direction: -1 | 1) {
    setBlocks((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setDirty(true);
  }

  function addBlock(type: BlockType) {
    const block = newBlock(type);
    setBlocks((prev) => [...prev, block]);
    setDirty(true);
    pendingScrollIdRef.current = block.id;
  }

  async function saveTemplate(): Promise<boolean> {
    if (!name.trim() || !roleLabel.trim()) {
      setError("Укажите название шаблона и роль");
      return false;
    }
    setSaving(true);
    setError(null);

    const payload = { name, roleLabel, description, estimatedDuration, blocks };
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

    setShowSavedToast(true);
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setShowSavedToast(false), 2500);

    return true;
  }

  async function handleSaveClick() {
    const ok = await saveTemplate();
    if (ok) {
      router.push(`/admin/templates/${savedIdRef.current}`);
      router.refresh();
    }
  }

  // Cancel means "stay on this page" (standard dialog semantics) — the user can
  // simply click the same link again once ready. OK saves and navigates in one go,
  // so there is never a need to click the destination link a second time. Preview
  // navigates in the same tab (rather than opening a new one) specifically so this
  // save-then-go doesn't depend on window.open surviving an async gap after the
  // confirm() dialog — that pattern is unreliable across real browsers' popup
  // blockers even though it works in automated/headless testing.
  function guardNav(e: React.MouseEvent, href: string) {
    if (!dirty) return;
    e.preventDefault();

    const wantsSave = confirm(
      "В шаблоне есть несохранённые изменения. Сохранить и перейти?"
    );
    if (!wantsSave) return;

    saveTemplate().then((ok) => {
      if (!ok) return;
      router.push(href);
      router.refresh();
    });
  }

  const templatesHref = "/admin";
  const previewHref = initial.id ? `/admin/templates/${initial.id}/preview` : "";
  const submissionsHref = initial.id
    ? `/admin/templates/${initial.id}/submissions`
    : "";

  return (
    <div className="space-y-6">
      {showSavedToast && (
        <div className="fixed top-4 right-4 z-30 flex items-center gap-2 rounded-xl border border-[#d7dfb0] bg-[#eef2d9] text-[#55611f] px-4 py-2.5 text-sm font-medium shadow-lg toast-in">
          <Check className="w-4 h-4" />
          Изменения сохранены
        </div>
      )}
      <BackLink href={templatesHref} onClick={(e) => guardNav(e, templatesHref)}>
        Шаблоны
      </BackLink>

      <h1 className="text-2xl font-semibold text-foreground">{title}</h1>

      <div className="flex items-start gap-8">
        <div className="sticky top-20 z-20 flex max-h-[calc(100vh-7rem)] w-48 flex-shrink-0 flex-col gap-1 overflow-y-auto rounded-2xl border border-line bg-white p-2 shadow-lg">
          <p className="px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
            Вопросы
          </p>
          {blocks.length === 0 && (
            <p className="px-2 py-1 text-xs text-slate-400">Пока нет вопросов</p>
          )}
          {blocks.map((block) => {
            const Icon = BLOCK_TYPE_ICONS[block.type];
            return (
              <button
                key={block.id}
                onClick={() => scrollToBlock(block.id)}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs text-muted transition hover:bg-black/5 hover:text-foreground"
              >
                <span
                  className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg ${
                    isDisplayOnlyBlock(block.type)
                      ? "bg-accent2-soft text-accent2-strong"
                      : "bg-accent-soft text-accent"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="truncate">{block.title || BLOCK_TYPE_LABELS[block.type]}</span>
              </button>
            );
          })}
        </div>

        <div className="min-w-0 flex-1 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
            <input
              value={name}
              onChange={(e) => updateName(e.target.value)}
              placeholder="Название шаблона, например «Backend-стажёр»"
              className="w-full text-lg font-medium rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <div className="flex gap-3">
              <input
                value={roleLabel}
                onChange={(e) => updateRoleLabel(e.target.value)}
                placeholder="Роль, например «Стажёр-разработчик»"
                className="flex-1 text-sm rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <input
                value={estimatedDuration}
                onChange={(e) => updateEstimatedDuration(e.target.value)}
                placeholder="Срок выполнения, например «2–3 дня»"
                className="w-56 text-sm rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <textarea
              value={description}
              onChange={(e) => updateDescription(e.target.value)}
              placeholder="Короткое описание задания для кандидата"
              rows={2}
              className="w-full text-sm rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
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

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="sticky top-20 z-20 flex w-52 flex-shrink-0 flex-col gap-2 rounded-2xl border border-line bg-white p-2 shadow-lg">
          <button
            onClick={handleSaveClick}
            disabled={saving}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-50 text-emerald-700 px-3 py-2 text-sm font-medium shadow-sm transition hover:bg-emerald-700 hover:text-white active:bg-emerald-700 active:text-white disabled:opacity-50"
          >
            {saving ? "Сохранение..." : "Сохранить"}
          </button>
          {initial.id && (
            <>
              <Link
                href={previewHref}
                onClick={(e) => guardNav(e, previewHref)}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-accent2-soft text-accent2-strong px-3 py-2 text-sm font-medium transition hover:bg-amber-100"
              >
                <Eye className="w-4 h-4" />
                Предпросмотр
              </Link>
              <Link
                href={submissionsHref}
                onClick={(e) => guardNav(e, submissionsHref)}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-accent to-accent-deep text-white px-3 py-2 text-sm font-medium shadow-sm transition hover:brightness-110"
              >
                Прохождения
                <ArrowRight className="w-4 h-4" />
              </Link>
            </>
          )}

          <div className="my-1 border-t border-line" />

          <DropdownMenu
            trigger={
              <>
                <Plus className="w-4 h-4" />
                Добавить вопрос
              </>
            }
            triggerClassName="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-foreground transition hover:bg-slate-200"
            panelClassName="w-full"
            ariaLabel="Добавить вопрос"
            inline
          >
            {ADD_BLOCK_OPTIONS.map(({ type, icon: Icon, title, description }) => (
              <button
                key={type}
                onClick={() => addBlock(type)}
                className="flex w-full items-start gap-3 px-3 py-2.5 text-left transition hover:bg-black/5"
              >
                <span
                  className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${
                    isDisplayOnlyBlock(type)
                      ? "bg-accent2-soft text-accent2-strong"
                      : "bg-accent-soft text-accent"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-sm font-medium text-foreground">{title}</span>
                  <span className="mt-0.5 block text-xs text-muted">{description}</span>
                </span>
              </button>
            ))}
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
