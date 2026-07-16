import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
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
            alignItems: "center",
            justifyContent: "center",
            width: 72,
            height: 72,
            borderRadius: 16,
            background: "white",
            marginBottom: 40,
          }}
        >
          <svg width="38" height="38" viewBox="0 0 18 18" fill="none">
            <path
              d="M3.5 9.5L7 13L14.5 5"
              stroke="#0f172a"
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div style={{ display: "flex", fontSize: 60, fontWeight: 600, lineHeight: 1.15 }}>
          Конструктор тестовых заданий
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 28,
            color: "#94a3b8",
            marginTop: 20,
          }}
        >
          Отклики на тестовые задания по кастомным флоу для каждой роли
        </div>
      </div>
    ),
    size
  );
}
