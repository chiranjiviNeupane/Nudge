"use client";

import { useParams } from "next/navigation";
import { Page, PageHeader } from "@/components/layout/Page";
import { TemplateEditor } from "@/components/templates/TemplateEditor";
import { useTemplate } from "@/lib/hooks/data";

export default function TemplatePage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === "new";
  const template = useTemplate(isNew ? null : id);

  if (!isNew && template === undefined) return null;
  if (!isNew && template === null) {
    return (
      <Page>
        <PageHeader title="Workout not found" back={{ href: "/workouts", label: "Workouts" }} />
      </Page>
    );
  }

  // Keyed so the editor's local state resets when switching templates.
  return <TemplateEditor key={template?.id ?? "new"} template={template ?? null} />;
}
