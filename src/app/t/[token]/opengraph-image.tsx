import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Read-only lookup — must never mutate submission status. Link-preview bots
// (Slack/Telegram/iMessage) fetch this to build the unfurl card, and doing so
// should have no side effects on the candidate's submission (see
// src/app/api/public/submissions/[token]/open/route.ts for where the actual
// "opened" mutation lives instead).
export default async function Image({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const submission = await prisma.submission.findUnique({
    where: { token },
    include: { template: true },
  });

  const roleLabel = submission?.template.roleLabel ?? "Тестовое задание";
  const templateName = submission?.template.name ?? "Конструктор тестовых заданий";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#0f172a",
          color: "white",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 24,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: "#94a3b8",
            marginBottom: 24,
          }}
        >
          {roleLabel}
        </div>
        <div style={{ display: "flex", fontSize: 56, fontWeight: 600, lineHeight: 1.2 }}>
          {templateName}
        </div>
      </div>
    ),
    size
  );
}
