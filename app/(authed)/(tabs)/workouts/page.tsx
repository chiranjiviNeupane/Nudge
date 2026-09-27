"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Play, Plus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { deleteTemplate } from "@/lib/repositories/templates";
import { EmptyState, Page, PageHeader } from "@/components/layout/Page";
import { useActiveSession, useTemplates } from "@/lib/hooks/data";
import { useStartWorkout } from "@/components/workout/useStartWorkout";
import { pluralize } from "@/lib/format";
import { AddExamplesButton } from "@/components/templates/AddExamplesButton";
import { cn } from "@/lib/utils";
import { RoutinePreview } from "@/components/templates/RoutinePreview";
import { Skeleton } from "@/components/layout/Skeleton";
import { errorMessage } from "@/lib/repositories/errors";

export default function WorkoutsPage() {
  const templates = useTemplates();
  const active = useActiveSession();
  const { start, starting } = useStartWorkout();
  const router = useRouter();
  const [toDelete, setToDelete] = useState<{ id: string; name: string } | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const preview = templates?.find((t) => t.id === previewId) ?? null;

  return (
    <Page>
      <PageHeader
        title="Routines"
        subtitle={templates ? pluralize(templates.length, "routine") : undefined}
        action={
          <Button asChild className="h-9 rounded-full px-3.5 text-sm font-medium">
            <Link href="/workouts/new">
              <Plus /> New
            </Link>
          </Button>
        }
      />

      {templates === undefined ? (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-[repeat(2,minmax(0,1fr))]" aria-hidden>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[76px] rounded-2xl" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <EmptyState title="No routines yet">
          <p className="text-sm text-muted-foreground">
            Create one like “Push Day”, or start with the examples.
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            <Button asChild size="cta">
              <Link href="/workouts/new">
                <Plus /> New routine
              </Link>
            </Button>
            <AddExamplesButton />
          </div>
        </EmptyState>
      ) : (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 md:grid-cols-[repeat(2,minmax(0,1fr))]">
          {/* minmax(0, 1fr) + min-w-0: a long exercise list truncates instead of widening the page. */}
          {templates?.map((t) => {
            const isActive = active?.templateId === t.id;
            return (
              <li
                key={t.id}
                className={cn(
                  "flex min-w-0 items-center gap-1 rounded-2xl border bg-card p-2 pl-4 transition-colors",
                  isActive && "border-foreground/40",
                )}
              >
                {/* Tapping a routine previews it (Start is the big button there); editing is in ⋯. */}
                <button
                  type="button"
                  onClick={() => setPreviewId(t.id)}
                  className="min-w-0 flex-1 rounded-lg py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label={`${t.name}: show exercises`}
                >
                  <span className="display block truncate text-lg">{t.name}</span>
                  <span className="mt-1 block truncate text-sm text-muted-foreground">
                    <span className="mr-1.5 text-foreground/80">
                      {t.items.length === 0 ? "Empty" : pluralize(t.items.length, "exercise")}
                    </span>
                    {t.items.map((i) => i.exercise.name).join(" · ")}
                  </span>
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-10 shrink-0 text-muted-foreground"
                      aria-label={`${t.name} options`}
                    >
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem className="h-10" onSelect={() => router.push(`/workouts/${t.id}`)}>
                      <Pencil /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="h-10"
                      variant="destructive"
                      onSelect={() => setToDelete({ id: t.id, name: t.name })}
                    >
                      <Trash2 /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  size="icon"
                  className="ml-1 size-11 shrink-0 rounded-full"
                  aria-label={isActive ? `Resume ${t.name}` : `Start ${t.name}`}
                  disabled={starting !== null || t.items.length === 0}
                  onClick={() => start(t.id)}
                >
                  {isActive ? (
                    <RotateCcw className="size-5" />
                  ) : (
                    <Play className="size-5 translate-x-px fill-current" />
                  )}
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      {templates && templates.length > 0 && (
        <button
          type="button"
          disabled={starting !== null}
          onClick={() => start(null)}
          className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed text-sm font-medium text-muted-foreground outline-none transition-colors hover:border-foreground/40 hover:text-foreground focus-visible:border-foreground/60 disabled:opacity-50"
        >
          <Plus className="size-4" /> Start an empty workout
        </button>
      )}

      <RoutinePreview
        template={preview}
        onClose={() => setPreviewId(null)}
        activeTemplateId={active?.templateId ?? null}
        starting={starting !== null}
        onStart={(id) => {
          setPreviewId(null);
          start(id);
        }}
      />

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={`Delete ${toDelete?.name ?? "routine"}?`}
        description="Your past workouts and exercise history are kept."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (!toDelete) return;
          try {
            await deleteTemplate(toDelete.id);
            toast(`Deleted ${toDelete.name}`);
          } catch (e) {
            toast.error(errorMessage(e, "Couldn’t delete routine"));
          } finally {
            setToDelete(null);
          }
        }}
      />
    </Page>
  );
}
