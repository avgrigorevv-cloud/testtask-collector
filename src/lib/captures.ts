import type { Pin } from "@/lib/blocks";

export const MAX_PINS = 100;
export const MAX_COMMENT_LENGTH = 2000;
export const MAX_NOTE_LENGTH = 5000;
export const MAX_PAGE_URL_LENGTH = 4000;

// Validates pins sent by the extension. Shape matches the Pin type used by
// ImageAnnotate, so the admin can render captures with the same component.
export function parsePins(raw: unknown): Pin[] | null {
  let value: unknown = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(value) || value.length > MAX_PINS) return null;
  const pins: Pin[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const p = item as Record<string, unknown>;
    const x = Number(p.x);
    const y = Number(p.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    if (x < 0 || x > 100 || y < 0 || y > 100) return null;
    const comment = typeof p.comment === "string" ? p.comment : "";
    if (comment.length > MAX_COMMENT_LENGTH) return null;
    pins.push({ imageIndex: 0, x, y, comment });
  }
  return pins;
}

export function optionalText(value: FormDataEntryValue | null, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

export function optionalInt(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string") return null;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 && n < 100000 ? n : null;
}

export function isAbsoluteHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function pluralize(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}
