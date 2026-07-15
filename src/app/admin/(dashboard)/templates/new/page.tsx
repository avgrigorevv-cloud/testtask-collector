import { TemplateBuilder } from "@/components/admin/TemplateBuilder";

export default function NewTemplatePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Новый шаблон</h1>
      <TemplateBuilder
        initial={{ name: "", roleLabel: "", description: "", blocks: [] }}
      />
    </div>
  );
}
