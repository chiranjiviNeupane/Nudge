import type { SessionSummary, WorkoutTemplate } from "@/lib/db/types";

/**
 * Suggest today's workout: the template after the one used most recently
 * (in creation order), so Push → Pull → Legs rotates naturally.
 */
export function suggestNextTemplate<T extends Pick<WorkoutTemplate, "id">>(
  templates: T[],
  recent: Pick<SessionSummary, "template_id">[],
): T | null {
  if (templates.length === 0) return null;
  const lastTemplateId = recent.find((s) => s.template_id)?.template_id;
  const i = templates.findIndex((t) => t.id === lastTemplateId);
  return i === -1 ? templates[0] : templates[(i + 1) % templates.length];
}
