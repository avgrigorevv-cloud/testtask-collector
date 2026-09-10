import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-semibold text-foreground">
          Конструктор тестовых заданий
        </h1>
        <p className="text-muted">
          Собирайте отклики на тестовые задания по кастомным флоу для каждой роли.
        </p>
        <Link
          href="/admin"
          className="inline-block rounded-xl bg-gradient-to-br from-accent to-accent-deep text-white px-5 py-2.5 text-sm font-medium shadow-sm transition hover:brightness-110"
        >
          Перейти в Admin panel
        </Link>
      </div>
    </div>
  );
}
