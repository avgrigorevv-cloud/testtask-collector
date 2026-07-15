"use client";

import { useRef, useState } from "react";
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
  blocks,
  initialAnswers,
  initialStatus,
  preview = false,
}: {
  token: string;
  templateName: string;
  roleLabel: string;
  description: string;
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
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

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
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("token", token);
      const res = await fetch("/api/public/upload", { method: "POST", body: fd });
      if (res.ok) uploaded.push(await res.json());
    }
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
      <div className="min-h-screen bg-slate-50 max-w-2xl mx-auto px-4 py-24 text-center">
        <h1 className="text-2xl font-semibold text-slate-900">Спасибо!</h1>
        <p className="text-slate-500 mt-2">
          Ваш ответ по заданию «{templateName}» отправлен. Мы свяжемся с вами по итогам
          проверки.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {preview && (
        <div className="sticky top-0 z-10 bg-amber-400 text-amber-950 text-sm text-center py-2 font-medium">
          Предпросмотр — вы видите то, что увидит кандидат. Ответы не сохраняются.
        </div>
      )}
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">{roleLabel}</p>
          <h1 className="text-2xl font-semibold text-slate-900 mt-1">{templateName}</h1>
          {description && <p className="text-slate-500 mt-2">{description}</p>}
        </div>

        <div className="space-y-5">
          {blocks.map((block) => (
            <div
              id={`block-${block.id}`}
              key={block.id}
              className={`rounded-xl border bg-white p-5 ${
                missing.has(block.id) ? "border-red-400" : "border-slate-200"
              }`}
            >
              <p className="font-medium text-slate-900">
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
                        rel="noreferrer"
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
                  className="w-full mt-2 text-sm rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900"
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
                    className="w-full mt-2 text-sm rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                ) : (
                  <input
                    value={(answers[block.id] as TextAnswerValue | undefined)?.text ?? ""}
                    onChange={(e) =>
                      setAnswer(block.id, "text", { text: e.target.value })
                    }
                    placeholder={block.config.placeholder}
                    className="w-full mt-2 text-sm rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900"
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
          className="w-full rounded-lg bg-slate-900 text-white py-3 text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
        >
          {preview ? "Отправить задание (недоступно в предпросмотре)" : submitting ? "Отправка..." : "Отправить задание"}
        </button>
      </div>
    </div>
  );
}
