"use client";

import { useParams } from "next/navigation";
import { Page, PageHeader } from "@/components/layout/Page";
import { TemplateEditor } from "@/components/templates/TemplateEditor";
import { useTemplate } from "@/lib/hooks/data";
import { HeaderSkeleton, Skeleton } from "@/components/layout/Skeleton";

export default function TemplatePage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === "new";
  const template = useTemplate(isNew ? null : id);

  if (!isNew && template === undefined) {
    return (
      <Page wide>
        <HeaderSkeleton />
        <Skeleton className="mb-8 h-12 rounded-xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </Page>
    );
  }
  if (!isNew && template === null) {
    return (
      <Page>
        <PageHeader title="Routine not found" back={{ href: "/workouts", label: "Routines" }} />
      </Page>
    );
  }

  // Keyed so the editor's local state resets when switching templates.
  return <TemplateEditor key={template?.id ?? "new"} template={template ?? null} />;
}
