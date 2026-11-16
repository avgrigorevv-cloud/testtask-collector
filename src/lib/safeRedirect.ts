// Where to go after the admin login. Only same-site absolute paths are allowed:
// "https://evil.example", "//evil.example" and "/\evil.example" would otherwise
// turn /admin/login?next=... into an open redirect (phishing after login).
export function safeNextPath(next: string | null | undefined, fallback = "/admin"): string {
  if (!next || !next.startsWith("/")) return fallback;
  if (next.startsWith("//") || next.startsWith("/\\")) return fallback;
  // control characters / backslashes are normalised by browsers into "//"
  if (/[\u0000-\u001f\\]/.test(next)) return fallback;
  return next;
}
