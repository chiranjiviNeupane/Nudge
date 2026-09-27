"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, PageHeader } from "@/components/layout/Page";
import { ExerciseDialog } from "@/components/exercises/ExerciseDialog";
import { matchesGroup, MuscleGroupFilter } from "@/components/exercises/MuscleGroupChips";
import { useExercises } from "@/lib/hooks/data";
import { createExercise } from "@/lib/repositories/exercises";
import { rememberReturn, RETURN_TO_EXERCISES } from "@/lib/navigation/returnTo";
import { formatMuscleGroups, type MuscleGroup } from "@/lib/muscleGroups";
import { cn } from "@/lib/utils";
import { ListSkeleton } from "@/components/layout/Skeleton";

function groupByLetter<T extends { name: string }>(items: T[]): [string, T[]][] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const letter = /[a-z]/i.test(item.name[0] ?? "") ? item.name[0].toUpperCase() : "#";
    groups.set(letter, [...(groups.get(letter) ?? []), item]);
  }
  return [...groups.entries()];
}

/**
 * Searchable, filterable A–Z exercise library. The whole Exercises page on
 * phones; on wide screens a sticky column (`sidebar`) beside the selected
 * exercise, which it highlights.
 */
export function ExerciseLibrary({ sidebar = false, activeId }: { sidebar?: boolean; activeId?: string }) {
  const router = useRouter();
  const exercises = useExercises();
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [group, setGroup] = useState<MuscleGroup | null>(null);

  const q = query.trim().toLowerCase();
  const filtered = (exercises ?? []).filter(
    (e) => (!q || e.name.toLowerCase().includes(q)) && matchesGroup(e, group),
  );

  const newButton = (
    <Button onClick={() => setCreating(true)} className="h-9 rounded-full px-3.5 text-sm font-medium">
      <Plus /> New
    </Button>
  );
  const subtitle = exercises ? `${exercises.length} in your library` : undefined;

  return (
    <>
      {sidebar ? (
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="display text-2xl">Exercises</h1>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          {newButton}
        </div>
      ) : (
        <PageHeader title="Exercises" subtitle={subtitle} action={newButton} />
      )}

      <div className={cn("flex flex-col gap-3", sidebar ? "mb-4" : "mb-6")}>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search exercises…"
            className={cn(
              "rounded-xl border-0 bg-surface pl-10 text-base md:text-base",
              sidebar ? "h-10 md:text-sm" : "h-12",
            )}
            aria-label="Search exercises"
          />
        </div>
        <MuscleGroupFilter exercises={exercises ?? []} value={group} onChange={setGroup} />
      </div>

      {exercises === undefined ? (
        <ListSkeleton rows={8} />
      ) : exercises.length === 0 ? (
        <EmptyState title="No exercises yet">
          <p className="text-sm text-muted-foreground">
            Create your first one, or add the example routines on the Routines tab. They come with 15 exercises.
          </p>
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-5">
          {groupByLetter(filtered).map(([letter, items]) => (
            <section key={letter} aria-label={letter}>
              <h2 className="mb-1 flex items-center gap-3 text-xs font-semibold text-muted-foreground">
                {letter}
                <span aria-hidden className="h-px flex-1 bg-border" />
              </h2>
              <ul>
                {items.map((e) => {
                  const active = e.id === activeId;
                  const meta = [e.kind === "timed" ? "Timed" : null, formatMuscleGroups(e.muscle_groups) || null]
                    .filter(Boolean)
                    .join(" · ");
                  return (
                    <li key={e.id}>
                      <Link
                        href={`/exercises/${e.id}`}
                        aria-current={active ? "page" : undefined}
                        onClick={() => rememberReturn(e.id, RETURN_TO_EXERCISES)}
                        className={cn(
                          "group -mx-2 flex items-center justify-between rounded-lg px-2 outline-none focus-visible:bg-muted",
                          sidebar ? "h-10" : "h-12",
                          active ? "bg-surface-2" : "hover:bg-muted/60",
                        )}
                      >
                        <span className={cn("min-w-0 flex-1 truncate", sidebar ? "text-sm" : "text-base", active && "font-medium")}>
                          {e.name}
                        </span>
                        {meta && (
                          <span className="mr-2 max-w-[45%] shrink-0 truncate text-xs text-muted-foreground">{meta}</span>
                        )}
                        {!sidebar && (
                          <ChevronRight className="size-4 text-muted-foreground/60 group-hover:text-foreground" />
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
          {(q || group) && filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">No matches.</p>
          )}
        </div>
      )}

      <ExerciseDialog
        open={creating}
        onOpenChange={setCreating}
        title="New exercise"
        submitLabel="Create"
        initial={{ name: query, muscleGroups: group ? [group] : [] }}
        onSubmit={async (input) => {
          const exercise = await createExercise(input);
          // Stay on the list so several can be added in a row.
          toast.success(`Added ${exercise.name}`, {
            action: {
              label: "View",
              onClick: () => {
                rememberReturn(exercise.id, RETURN_TO_EXERCISES);
                router.push(`/exercises/${exercise.id}`);
              },
            },
          });
          setQuery("");
        }}
      />
    </>
  );
}
