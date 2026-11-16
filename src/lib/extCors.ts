import { NextResponse } from "next/server";

// The browser extension calls /api/ext/* from its service worker, whose
// origin is chrome-extension://<id>. Instead of asking the user for a host
// permission on the server's domain, the server allows extension origins via
// CORS. Safe: these endpoints use a Bearer token, never cookies, so there is
// no ambient credential a foreign origin could ride on.
const EXTENSION_ORIGIN_RE = /^(chrome|moz)-extension:\/\/[a-z0-9-]+$/i;

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin");
  if (!origin || !EXTENSION_ORIGIN_RE.test(origin)) return {};
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
    const response = await handler(request);
    for (const [k, v] of Object.entries(corsHeaders(request))) response.headers.set(k, v);
    return response;
  };
}

export function extPreflight(request: Request): Response {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}
