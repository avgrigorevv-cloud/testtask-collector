import { NextResponse } from "next/server";

type Params = { params: Promise<{ filename: string }> };

// Backward-compat redirect: admin uploads used to be served as static files
// under public/uploads/admin/, and that URL shape is baked into Template.blocks
// JSON for any attachment uploaded before the move to src/app/api/files/admin
// (see TECH_DEBT.md item #7). public/uploads/admin/ no longer exists at all —
// without this, every pre-existing attachment link would 404 permanently.
export async function GET(request: Request, { params }: Params) {
  const { filename } = await params;
  // request.url reflects the address Next.js itself is bound to
  // (localhost:3000 inside the container), not the public domain the
  // request actually came in on through Caddy — use NEXT_PUBLIC_BASE_URL
  // like the rest of the app does (see src/lib/auth.ts's cookie secure flag).
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || new URL(request.url).origin;
  return NextResponse.redirect(new URL(`/api/files/admin/${filename}`, baseUrl), 308);
}
