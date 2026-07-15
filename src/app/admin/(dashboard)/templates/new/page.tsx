import Link from "next/link";
import { TemplateBuilder } from "@/components/admin/TemplateBuilder";

export default function NewTemplatePage() {
  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin" className="text-sm text-slate-500 hover:text-slate-900">
          ← Шаблоны
        </Link>
      </div>
      <h1 className="text-2xl font-semibold text-slate-900">Новый шаблон</h1>
      <TemplateBuilder
        initial={{ name: "", roleLabel: "", description: "", blocks: [] }}
      />
    </div>
  );
}
