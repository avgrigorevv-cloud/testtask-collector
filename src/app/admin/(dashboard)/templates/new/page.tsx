import { TemplateBuilder } from "@/components/admin/TemplateBuilder";

export default function NewTemplatePage() {
  return (
    <TemplateBuilder
      title="Новый шаблон"
      initial={{ name: "", roleLabel: "", description: "", estimatedDuration: "", blocks: [] }}
    />
  );
}
