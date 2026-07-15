import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900">
          Конструктор тестовых заданий
        </h1>
        <p className="text-slate-500">
          Собирайте отклики на тестовые задания по кастомным флоу для каждой роли.
        </p>
        <Link
          href="/admin"
          className="inline-block rounded-lg bg-slate-900 text-white px-5 py-2.5 text-sm font-medium hover:bg-slate-800"
        >
          Перейти в админку
        </Link>
      </div>
    </div>
  );
}
