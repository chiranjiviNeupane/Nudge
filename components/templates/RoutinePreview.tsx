"use client";

import Link from "next/link";
import { Pencil, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResponsiveModal } from "@/components/common/ResponsiveModal";
import { useRecentSessions, type TemplateWithExercises } from "@/lib/hooks/data";
import { formatRelativeDay, pluralize } from "@/lib/format";

/** What's in a routine and when you last did it, with Start as the main action. */
export function RoutinePreview({
  template,
  onClose,
  activeTemplateId,
  starting,
  onStart,
}: {
  template: TemplateWithExercises | null;
  onClose: () => void;
  activeTemplateId: string | null;
  starting: boolean;
  onStart: (templateId: string) => void;
}) {
  const recent = useRecentSessions(10);
  const lastDone = template ? recent?.find((s) => s.template_id === template.id) : undefined;
  const isActive = template !== null && activeTemplateId === template.id;

  return (
    <ResponsiveModal
      open={template !== null}
      onOpenChange={(open) => !open && onClose()}
      title={template?.name ?? "Routine"}
      description={
        template
          ? [
              pluralize(template.items.length, "exercise"),
              lastDone ? `last done ${formatRelativeDay(lastDone.completed_at).toLowerCase()}` : null,
            ]
              .filter(Boolean)
              .join(" · ")
          : undefined
      }
    >
      {template && (
        <div className="flex min-h-0 flex-1 flex-col gap-4 pt-2">
          {template.items.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">No exercises yet. Add some in the editor.</p>
          ) : (
            <ol className="-mx-1 min-h-0 flex-1 divide-y overflow-y-auto">
              {template.items.map((item, i) => (
                <li key={item.id} className="flex items-baseline gap-3 px-1 py-2.5">
                  <span className="numeric w-5 shrink-0 text-right text-xs text-muted-foreground">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate">{item.exercise.name}</span>
                  <span className="shrink-0 text-sm text-muted-foreground">{pluralize(item.defaultSets, "set")}</span>
                </li>
              ))}
            </ol>
          )}
          <div className="flex flex-col gap-2">
            <Button
              size="cta"
              disabled={starting || template.items.length === 0}
              onClick={() => onStart(template.id)}
            >
              {isActive ? <RotateCcw /> : <Play className="fill-current" />}
              {isActive ? "Resume workout" : "Start workout"}
            </Button>
            <Button asChild size="cta" variant="ghost">
              <Link href={`/workouts/${template.id}`}>
                <Pencil /> Edit routine
              </Link>
            </Button>
          </div>
        </div>
      )}
    </ResponsiveModal>
  );
}
