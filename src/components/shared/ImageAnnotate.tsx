"use client";

import type { Pin } from "@/lib/blocks";

export function ImageAnnotate({
  images,
  pins,
  onChange,
  readOnly,
}: {
  images: { url: string; label?: string }[];
  pins: Pin[];
  onChange?: (pins: Pin[]) => void;
  readOnly?: boolean;
}) {
  const pinNumbers = new Map<number, number>();
  pins.forEach((_, idx) => pinNumbers.set(idx, idx + 1));

  function handleImageClick(
    e: React.MouseEvent<HTMLDivElement>,
    imageIndex: number
  ) {
    if (readOnly || !onChange) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const newPin: Pin = { imageIndex, x, y, comment: "" };
    onChange([...pins, newPin]);
  }

  function updateComment(pinIndex: number, comment: string) {
    if (!onChange) return;
    const next = pins.map((p, i) => (i === pinIndex ? { ...p, comment } : p));
    onChange(next);
  }

  function removePin(pinIndex: number) {
    if (!onChange) return;
    onChange(pins.filter((_, i) => i !== pinIndex));
  }

  return (
    <div className="space-y-8">
      {images.map((image, imageIndex) => {
        const imagePins = pins
          .map((p, idx) => ({ ...p, idx }))
          .filter((p) => p.imageIndex === imageIndex);

        return (
          <div key={imageIndex} className="space-y-2">
            {image.label && (
              <p className="text-sm font-medium text-slate-700">{image.label}</p>
            )}
            <div
              className={`relative inline-block border border-slate-200 rounded-lg overflow-hidden ${
                readOnly ? "" : "cursor-crosshair"
              }`}
              onClick={(e) => handleImageClick(e, imageIndex)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.url}
                alt={image.label ?? `Скриншот ${imageIndex + 1}`}
                className="max-w-full select-none"
                draggable={false}
              />
              {imagePins.map((p) => (
                <div
                  key={p.idx}
                  className="absolute w-6 h-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500 text-white text-xs font-semibold flex items-center justify-center shadow ring-2 ring-white"
                  style={{ left: `${p.x}%`, top: `${p.y}%` }}
                >
                  {pinNumbers.get(p.idx)}
                </div>
              ))}
            </div>
            {!readOnly && (
              <p className="text-xs text-slate-400">
                Кликните по скриншоту, чтобы отметить проблему
              </p>
            )}
            {imagePins.length > 0 && (
              <ul className="space-y-2">
                {imagePins.map((p) => (
                  <li
                    key={p.idx}
                    className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2"
                  >
                    <span className="mt-1 shrink-0 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center">
                      {pinNumbers.get(p.idx)}
                    </span>
                    {readOnly ? (
                      <p className="text-sm text-slate-700 flex-1">
                        {p.comment || <em className="text-slate-400">без комментария</em>}
                      </p>
                    ) : (
                      <>
                        <textarea
                          value={p.comment}
                          onChange={(e) => updateComment(p.idx, e.target.value)}
                          placeholder="Что не так в этом месте?"
                          rows={2}
                          className="flex-1 text-sm rounded-md border border-slate-300 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                        <button
                          onClick={() => removePin(p.idx)}
                          className="text-slate-400 hover:text-red-600 text-xs mt-1"
                        >
                          удалить
                        </button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
