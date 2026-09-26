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

export default function WorkoutsPage() {
  const templates = useTemplates();
  const active = useActiveSession();
  const { start, starting } = useStartWorkout();
  const router = useRouter();
  const [toDelete, setToDelete] = useState<{ id: string; name: string } | null>(null);

  return (
    <Page>
      <PageHeader
        title="Workouts"
        subtitle={templates ? pluralize(templates.length, "routine") : undefined}
        action={
          <Button asChild className="h-9 rounded-full px-3.5 text-sm font-medium">
            <Link href="/workouts/new">
              <Plus /> New
            </Link>
          </Button>
        }
      />

      {templates && templates.length === 0 ? (
        <EmptyState title="No routines yet">
          <p className="text-sm text-muted-foreground">
            Create one like “Push Day”, or start with the examples.
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            <Button asChild size="cta">
              <Link href="/workouts/new">
                <Plus /> New workout
              </Link>
            </Button>
            <AddExamplesButton />
          </div>
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {templates?.map((t) => {
            const isActive = active?.templateId === t.id;
            return (
              <li
                key={t.id}
                className={cn(
                  "flex items-center gap-1 rounded-2xl border bg-card p-2 pl-4 transition-colors",
                  isActive && "border-primary/60",
                )}
              >
                <Link
                  href={`/workouts/${t.id}`}
                  className="min-w-0 flex-1 rounded-lg py-2 outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label={`Edit ${t.name}`}
                >
                  <span className="display block truncate text-lg">{t.name}</span>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    <span className="mr-1.5 text-foreground/80">
                      {t.items.length === 0 ? "Empty" : pluralize(t.items.length, "exercise")}
                    </span>
                    {t.items.map((i) => i.exercise.name).join(" · ")}
                  </p>
                </Link>
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
          className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed text-sm font-medium text-muted-foreground outline-none transition-colors hover:border-primary/60 hover:text-primary focus-visible:border-primary disabled:opacity-50"
        >
          <Plus className="size-4" /> Start an empty workout
        </button>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={`Delete ${toDelete?.name ?? "workout"}?`}
        description="Your past workouts and exercise history are kept."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (!toDelete) return;
          try {
            await deleteTemplate(toDelete.id);
            toast(`Deleted ${toDelete.name}`);
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Could not delete");
          } finally {
            setToDelete(null);
          }
        }}
      />
    </Page>
  );
}
