import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ token: string }> };

// Marks a submission as opened. Deliberately separate from the page's server
// render (src/app/t/[token]/page.tsx) and only ever called from a client-side
// effect — link-preview bots (Slack/Telegram/iMessage unfurlers) fetch the
// page's HTML to read OG tags, which would otherwise falsely mark a
// submission "opened" before the candidate ever saw the link.
export async function POST(_request: Request, { params }: Params) {
  const { token } = await params;
  const submission = await prisma.submission.findUnique({ where: { token } });

  if (!submission) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  if (submission.status === "pending") {
    await prisma.submission.update({
      where: { id: submission.id },
      data: { status: "opened", openedAt: new Date() },
    });
  }

  return NextResponse.json({ ok: true });
}
