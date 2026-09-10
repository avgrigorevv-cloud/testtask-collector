"use client";

import { useEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";
import {
  isDisplayOnlyBlock,
  type Block,
  type FileUploadAnswerValue,
  type ImageAnnotateAnswerValue,
  type LinkAnswerValue,
  type Pin,
  type TextAnswerValue,
} from "@/lib/blocks";
import { ImageAnnotate } from "@/components/shared/ImageAnnotate";

type AnswersState = Record<string, unknown>;

export function CandidateFlow({
  token,
  templateName,
  roleLabel,
  description,
  estimatedDuration,
  blocks,
  initialAnswers,
  initialStatus,
  preview = false,
}: {
  token: string;
  templateName: string;
  roleLabel: string;
  description: string;
  estimatedDuration?: string;
  blocks: Block[];
  initialAnswers: AnswersState;
  initialStatus: string;
  preview?: boolean;
}) {
  const [answers, setAnswers] = useState<AnswersState>(initialAnswers);
  const [status, setStatus] = useState(initialStatus);
  const [missing, setMissing] = useState<Set<string>>(new Set());
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Marks the submission "opened" only once a real browser actually renders
  // this client component — link-preview bots fetch the page's HTML for OG
  // tags but never run JS, so they no longer trigger this (see
  // src/app/api/public/submissions/[token]/open/route.ts).
  useEffect(() => {
    if (preview || initialStatus !== "pending") return;
    fetch(`/api/public/submissions/${token}/open`, { method: "POST" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function saveAnswer(blockId: string, type: string, value: unknown) {
    if (preview) return Promise.resolve();
    return fetch(`/api/public/submissions/${token}/answers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blockId, type, value }),
    });
  }

  function flushPendingSaves() {
    const blockIds = Object.keys(timers.current);
    const saves = blockIds.map((blockId) => {
      clearTimeout(timers.current[blockId]);
      delete timers.current[blockId];
      const block = blocks.find((b) => b.id === blockId);
      if (!block) return Promise.resolve();
      return saveAnswer(blockId, block.type, answers[blockId]);
    });
    return Promise.all(saves);
  }

  function setAnswer(blockId: string, type: string, value: unknown, debounce = true) {
    setAnswers((prev) => ({ ...prev, [blockId]: value }));
    setMissing((prev) => {
      if (!prev.has(blockId)) return prev;
      const next = new Set(prev);
      next.delete(blockId);
      return next;
    });

    if (timers.current[blockId]) clearTimeout(timers.current[blockId]);
    if (debounce) {
      timers.current[blockId] = setTimeout(() => saveAnswer(blockId, type, value), 500);
    } else {
      saveAnswer(blockId, type, value);
    }
  }

  async function handleFileUpload(block: Block, files: FileList | null) {
    if (!files || files.length === 0) return;
    const current =
      (answers[block.id] as FileUploadAnswerValue | undefined)?.files ?? [];

    if (preview) {
      const fake = Array.from(files).map((f) => ({ url: "#", name: f.name }));
      setAnswer(block.id, "file_upload", { files: [...current, ...fake] }, false);
      return;
    }

    const uploaded: { url: string; name: string }[] = [];
    let lastError: string | null = null;
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("token", token);
      const res = await fetch("/api/public/upload", { method: "POST", body: fd });
      if (res.ok) {
        uploaded.push(await res.json());
      } else {
        const data = await res.json().catch(() => ({}));
        lastError = data.error ?? "Не удалось загрузить файл";
      }
    }
    setUploadErrors((prev) => ({ ...prev, [block.id]: lastError ?? "" }));
    setAnswer(block.id, "file_upload", { files: [...current, ...uploaded] }, false);
  }

  async function handleSubmit() {
    if (preview) return;
    setSubmitting(true);
    setSubmitError(null);
    await flushPendingSaves();
    const res = await fetch(`/api/public/submissions/${token}/submit`, {
      method: "POST",
    });
    setSubmitting(false);

    if (res.ok) {
      setStatus("submitted");
      return;
    }

    const data = await res.json().catch(() => ({}));
    setSubmitError(data.error ?? "Не удалось отправить задание");
    setMissing(new Set(data.missing ?? []));
    if (data.missing?.length) {
      const el = document.getElementById(`block-${data.missing[0]}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  if (status === "submitted") {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 py-24 text-center">
          <h1 className="text-2xl font-semibold text-foreground">Спасибо!</h1>
          <p className="text-muted mt-2">
            Ваш ответ по заданию «{templateName}» отправлен. Мы свяжемся с вами по итогам
            проверки.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {preview && (
        <div className="sticky top-0 z-10 border-b border-accent2/30 bg-accent2-soft text-accent2-strong text-sm text-center py-2 font-medium">
          Предпросмотр — вы видите то, что увидит кандидат. Ответы не сохраняются.
        </div>
      )}
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
        <div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">{roleLabel}</p>
            {estimatedDuration && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent-strong whitespace-nowrap">
                <Clock className="w-3.5 h-3.5" />
                {estimatedDuration}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-semibold text-foreground mt-1">{templateName}</h1>
          {description && <p className="text-muted mt-2">{description}</p>}
        </div>

        <div className="space-y-5">
          {blocks.map((block) => (
            <div
              id={`block-${block.id}`}
              key={block.id}
              className={`rounded-2xl border bg-surface p-5 ${
                missing.has(block.id) ? "border-red-400" : "border-slate-200"
              }`}
            >
              <p className="font-medium text-foreground">
                {block.title || "Без названия"}
                {block.required && !isDisplayOnlyBlock(block.type) && (
                  <span className="text-red-500"> *</span>
                )}
              </p>
              {block.description && (
                <p className="text-sm text-slate-500 mt-1 mb-3">{block.description}</p>
              )}

              {block.type === "attachment" && (
                <ul className="space-y-1 mt-2">
                  {block.config.files.map((f, i) => (
                    <li key={i}>
                      <a
                        href={f.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        📎 {f.name}
                      </a>
                    </li>
                  ))}
                </ul>
              )}

              {block.type === "link" && (
                <input
                  value={(answers[block.id] as LinkAnswerValue | undefined)?.url ?? ""}
                  onChange={(e) => setAnswer(block.id, "link", { url: e.target.value })}
                  placeholder={block.config.placeholder}
                  className="w-full mt-2 text-sm rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                />
              )}

              {block.type === "text" &&
                (block.config.multiline ?? true ? (
                  <textarea
                    value={(answers[block.id] as TextAnswerValue | undefined)?.text ?? ""}
                    onChange={(e) =>
                      setAnswer(block.id, "text", { text: e.target.value })
                    }
                    placeholder={block.config.placeholder}
                    rows={4}
                    className="w-full mt-2 text-sm rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                ) : (
                  <input
                    value={(answers[block.id] as TextAnswerValue | undefined)?.text ?? ""}
                    onChange={(e) =>
                      setAnswer(block.id, "text", { text: e.target.value })
                    }
                    placeholder={block.config.placeholder}
                    className="w-full mt-2 text-sm rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                ))}

              {block.type === "file_upload" && (
                <div className="mt-2 space-y-2">
                  <label
                    htmlFor={`file-${block.id}`}
                    className="inline-block cursor-pointer rounded-md bg-slate-100 hover:bg-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700"
                  >
                    Выбрать файлы
                  </label>
                  <input
                    id={`file-${block.id}`}
                    type="file"
                    multiple={(block.config.maxFiles ?? 5) > 1}
                    accept={block.config.accept}
                    onChange={(e) => handleFileUpload(block, e.target.files)}
                    className="sr-only"
                  />
                  <ul className="space-y-1">
                    {(
                      (answers[block.id] as FileUploadAnswerValue | undefined)?.files ?? []
                    ).map((f, i) => (
                      <li key={i} className="text-sm text-slate-600">
                        ✓ {f.name}
                      </li>
                    ))}
                  </ul>
                  {uploadErrors[block.id] && (
                    <p className="text-xs text-red-600">{uploadErrors[block.id]}</p>
                  )}
                </div>
              )}

              {block.type === "image_annotate" && (
                <div className="mt-2">
                  <ImageAnnotate
                    images={block.config.images}
                    pins={
                      (answers[block.id] as ImageAnnotateAnswerValue | undefined)?.pins ??
                      []
                    }
                    onChange={(pins: Pin[]) =>
                      setAnswer(block.id, "image_annotate", { pins }, false)
                    }
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {submitError && <p className="text-sm text-red-600">{submitError}</p>}

        <button
          onClick={handleSubmit}
          disabled={submitting || preview}
          title={preview ? "В режиме предпросмотра отправка отключена" : undefined}
          className="w-full rounded-xl bg-gradient-to-br from-accent to-accent-deep text-white py-3 text-sm font-semibold shadow-md shadow-accent/25 transition hover:brightness-110 disabled:opacity-50 disabled:shadow-none"
        >
          {preview ? "Отправить задание (недоступно в предпросмотре)" : submitting ? "Отправка..." : "Отправить задание"}
        </button>
      </div>
    </div>
  );
}
