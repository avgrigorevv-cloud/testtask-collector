import { NextResponse } from "next/server";
import { extPreflight, withExtCors } from "@/lib/extCors";
import { deleteExtSession } from "@/lib/extAuth";

export const POST = withExtCors(async function postHandler(request: Request) {
  await deleteExtSession(request);
  return NextResponse.json({ ok: true });
});

export function OPTIONS(request: Request) {
  return extPreflight(request);
}
