const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

export function isSafeExternalUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.trim().length === 0) return false;
  try {
    const parsed = new URL(value, "https://placeholder.invalid");
    return ALLOWED_PROTOCOLS.has(parsed.protocol) && !!parsed.hostname;
  } catch {
    return false;
  }
}
