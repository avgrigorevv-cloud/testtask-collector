import type { Block } from "@/lib/blocks";

export function isAnswerValueFilled(type: Block["type"], value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  switch (type) {
    case "link":
      return typeof v.url === "string" && v.url.trim().length > 0;
    case "text":
      return typeof v.text === "string" && v.text.trim().length > 0;
    case "file_upload":
      return Array.isArray(v.files) && v.files.length > 0;
    case "image_annotate":
      return Array.isArray(v.pins) && v.pins.length > 0;
    case "attachment":
    case "info":
      return true;
    default:
      return false;
  }
}
