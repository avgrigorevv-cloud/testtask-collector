"use client";

import { BLOCK_TYPE_LABELS, isDisplayOnlyBlock, type Block, type BlockType } from "@/lib/blocks";
import { AdminFileUpload } from "@/components/admin/AdminFileUpload";

const BLOCK_TYPE_COLORS: Record<BlockType, string> = {
  attachment: "text-amber-600",
  info: "text-accent",
  link: "text-sky-600",
  text: "text-violet-600",
  file_upload: "text-emerald-600",
  image_annotate: "text-rose-600",
};

const BLOCK_TYPE_BORDERS: Record<BlockType, string> = {
  attachment: "border-l-amber-400",
  info: "border-l-accent",
  link: "border-l-sky-400",
  text: "border-l-violet-400",
  file_upload: "border-l-emerald-400",
  image_annotate: "border-l-rose-400",
};

export function BlockEditorCard({
  block,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  block: Block;
  onChange: (block: Block) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-line border-l-4 bg-white p-4 space-y-3 shadow-sm transition hover:shadow-md hover:-translate-y-0.5 ${BLOCK_TYPE_BORDERS[block.type]}`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`text-xs font-bold uppercase tracking-wide ${BLOCK_TYPE_COLORS[block.type]}`}
        >
          {BLOCK_TYPE_LABELS[block.type]}
        </span>
        <div className="flex items-center gap-3">
          {!isDisplayOnlyBlock(block.type) && (
            <label className="flex items-center gap-1.5 text-xs text-slate-600 whitespace-nowrap">
              <input
                type="checkbox"
                checked={block.required}
                onChange={(e) => onChange({ ...block, required: e.target.checked })}
              />
              Обязательный
            </label>
          )}
          <div className="flex items-center gap-1">
            <button
              onClick={onMoveUp}
              disabled={isFirst}
              className="text-slate-400 hover:text-slate-900 disabled:opacity-30 text-sm px-1"
            >
              ↑
            </button>
            <button
              onClick={onMoveDown}
              disabled={isLast}
              className="text-slate-400 hover:text-slate-900 disabled:opacity-30 text-sm px-1"
            >
              ↓
            </button>
            <button
              onClick={onRemove}
              className="text-slate-400 hover:text-red-600 text-sm px-1"
            >
              удалить
            </button>
          </div>
        </div>
      </div>

      <input
        value={block.title}
        onChange={(e) => onChange({ ...block, title: e.target.value })}
        placeholder="Заголовок блока"
        className="w-full text-sm font-medium rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
      />
      <textarea
        value={block.description ?? ""}
        onChange={(e) => onChange({ ...block, description: e.target.value })}
        placeholder="Пояснение для кандидата (необязательно)"
        rows={2}
        className="w-full text-sm rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
      />

      {block.type === "attachment" && (
        <div className="space-y-2">
          <AdminFileUpload
            multiple
            onUploaded={(files) =>
              onChange({
                ...block,
                config: { files: [...block.config.files, ...files] },
              })
            }
          />
          {block.config.files.length > 0 && (
            <ul className="space-y-1">
              {block.config.files.map((f, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between text-sm bg-slate-50 rounded-md px-2 py-1"
                >
                  <span className="truncate">{f.name}</span>
                  <button
                    onClick={() =>
                      onChange({
                        ...block,
                        config: {
                          files: block.config.files.filter((_, idx) => idx !== i),
                        },
                      })
                    }
                    className="text-slate-400 hover:text-red-600 text-xs ml-2"
                  >
                    удалить
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {block.type === "link" && (
        <input
          value={block.config.placeholder ?? ""}
          onChange={(e) =>
            onChange({ ...block, config: { placeholder: e.target.value } })
          }
          placeholder="Плейсхолдер поля (например, https://github.com/...)"
          className="w-full text-sm rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
        />
      )}

      {block.type === "text" && (
        <div className="flex items-center gap-4">
          <input
            value={block.config.placeholder ?? ""}
            onChange={(e) =>
              onChange({
                ...block,
                config: { ...block.config, placeholder: e.target.value },
              })
            }
            placeholder="Плейсхолдер поля"
            className="flex-1 text-sm rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <label className="flex items-center gap-2 text-sm text-slate-600 whitespace-nowrap">
            <input
              type="checkbox"
              checked={block.config.multiline ?? true}
              onChange={(e) =>
                onChange({
                  ...block,
                  config: { ...block.config, multiline: e.target.checked },
                })
              }
            />
            Многострочный
          </label>
        </div>
      )}

      {block.type === "file_upload" && (
        <div className="flex items-center gap-4">
          <input
            value={block.config.accept ?? ""}
            onChange={(e) =>
              onChange({
                ...block,
                config: { ...block.config, accept: e.target.value },
              })
            }
            placeholder="Допустимые типы, например .pdf,.zip"
            className="flex-1 text-sm rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <input
            type="number"
            min={1}
            value={block.config.maxFiles ?? 5}
            onChange={(e) =>
              onChange({
                ...block,
                config: { ...block.config, maxFiles: Number(e.target.value) },
              })
            }
            className="w-24 text-sm rounded-md border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
      )}

      {block.type === "image_annotate" && (
        <div className="space-y-2">
          <AdminFileUpload
            multiple
            onUploaded={(files) =>
              onChange({
                ...block,
                config: {
                  images: [
                    ...block.config.images,
                    ...files.map((f) => ({ url: f.url, label: f.name })),
                  ],
                },
              })
            }
          />
          {block.config.images.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {block.config.images.map((img, i) => (
                <div key={i} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt={img.label ?? ""}
                    className="w-full h-20 object-cover rounded-md border border-slate-200"
                  />
                  <input
                    value={img.label ?? ""}
                    onChange={(e) =>
                      onChange({
                        ...block,
                        config: {
                          images: block.config.images.map((im, idx) =>
                            idx === i ? { ...im, label: e.target.value } : im
                          ),
                        },
                      })
                    }
                    placeholder="Подпись"
                    className="w-full mt-1 text-xs rounded border border-slate-300 px-1 py-0.5"
                  />
                  <button
                    onClick={() =>
                      onChange({
                        ...block,
                        config: {
                          images: block.config.images.filter((_, idx) => idx !== i),
                        },
                      })
                    }
                    className="absolute top-1 right-1 bg-white/90 rounded text-xs px-1 text-slate-500 hover:text-red-600"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
