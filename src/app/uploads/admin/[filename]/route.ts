import { NextResponse } from "next/server";

type Params = { params: Promise<{ filename: string }> };

// Backward-compat redirect: admin uploads used to be served as static files
// under public/uploads/admin/, and that URL shape is baked into Template.blocks
// JSON for any attachment uploaded before the move to src/app/api/files/admin
// (see TECH_DEBT.md item #7). public/uploads/admin/ no longer exists at all —
// without this, every pre-existing attachment link would 404 permanently.
export async function GET(request: Request, { params }: Params) {
  const { filename } = await params;
  return NextResponse.redirect(new URL(`/api/files/admin/${filename}`, request.url), 308);
}
