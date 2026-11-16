import { NextResponse } from "next/server";

// The browser extension calls /api/ext/* from its service worker, whose
// origin is chrome-extension://<id>. Instead of asking the user for a host
// permission on the server's domain, the server allows extension origins via
// CORS. Safe: these endpoints use a Bearer token, never cookies, so there is
// no ambient credential a foreign origin could ride on.
const EXTENSION_ORIGIN_RE = /^(chrome|moz)-extension:\/\/[a-z0-9-]+$/i;

// Optional allowlist: EXT_ALLOWED_ORIGINS="chrome-extension://<id>,chrome-extension://<id2>".
// Unset = any extension origin may call the API (it still needs a valid login /
// Bearer token). Set it in production once the extension id is known.
function originAllowed(origin: string): boolean {
  if (!EXTENSION_ORIGIN_RE.test(origin)) return false;
  const list = (process.env.EXT_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return list.length === 0 || list.includes(origin);
}

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin");
  if (!origin || !originAllowed(origin)) return { Vary: "Origin" };
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}

type Handler = (request: Request) => Promise<Response>;

export function withExtCors(handler: Handler): Handler {
  return async (request) => {
    let response: Response;
    try {
      response = await handler(request);
    } catch (e) {
      // Without CORS headers the browser hides a 500 and the extension would
      // report "can't connect" instead of a server error.
      console.error("[ext api]", e);
      response = NextResponse.json({ error: "Ошибка сервера, попробуйте еще раз" }, { status: 500 });
    }
    for (const [k, v] of Object.entries(corsHeaders(request))) response.headers.set(k, v);
    return response;
  };
}

export function extPreflight(request: Request): Response {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}
