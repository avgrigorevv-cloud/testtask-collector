import { NextResponse } from "next/server";
import { extPreflight, withExtCors } from "@/lib/extCors";
import { getExtUser } from "@/lib/extAuth";

export const GET = withExtCors(async function getHandler(request: Request) {
  const user = await getExtUser(request);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ login: user.login });
});

export function OPTIONS(request: Request) {
  return extPreflight(request);
}
