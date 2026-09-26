"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, Page, PageHeader } from "@/components/layout/Page";
import { ExerciseDialog } from "@/components/exercises/ExerciseDialog";
import { useExercises } from "@/lib/hooks/data";
import { createExercise } from "@/lib/repositories/exercises";
import { rememberReturn, RETURN_TO_EXERCISES } from "@/lib/navigation/returnTo";

function groupByLetter<T extends { name: string }>(items: T[]): [string, T[]][] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const letter = /[a-z]/i.test(item.name[0] ?? "") ? item.name[0].toUpperCase() : "#";
    groups.set(letter, [...(groups.get(letter) ?? []), item]);
  }
  return [...groups.entries()];
}

export default function ExercisesPage() {
  const router = useRouter();
  const exercises = useExercises();
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);

  const q = query.trim().toLowerCase();
  const filtered = (exercises ?? []).filter((e) => !q || e.name.toLowerCase().includes(q));

  return (
    <Page>
      <PageHeader
        title="Exercises"
        subtitle={exercises ? `${exercises.length} in your library` : undefined}
        action={
          <Button onClick={() => setCreating(true)} className="h-9 rounded-full px-3.5 text-sm font-medium">
            <Plus /> New
          </Button>
        }
      />

      <div className="relative mb-6">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search exercises…"
          className="h-12 rounded-xl border-0 bg-surface pl-10 text-base md:text-base"
          aria-label="Search exercises"
        />
      </div>

      {exercises && exercises.length === 0 ? (
        <EmptyState title="No exercises yet">
          <p className="text-sm text-muted-foreground">
            Create one here. Adding the example routines on Workouts also creates 15 exercises.
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
                {items.map((e) => (
                  <li key={e.id}>
                    <Link
                      href={`/exercises/${e.id}`}
                      onClick={() => rememberReturn(e.id, RETURN_TO_EXERCISES)}
                      className="group -mx-2 flex h-12 items-center justify-between rounded-lg px-2 outline-none hover:bg-muted/60 focus-visible:bg-muted"
                    >
                      <span className="min-w-0 flex-1 truncate text-base">{e.name}</span>
                      {e.kind === "timed" && (
                        <span className="mr-2 shrink-0 text-xs text-muted-foreground">Timed</span>
                      )}
                      <ChevronRight className="size-4 text-muted-foreground/60 group-hover:text-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {q && filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">No matches.</p>
          )}
        </div>
      )}

      <ExerciseDialog
        open={creating}
        onOpenChange={setCreating}
        title="New exercise"
        submitLabel="Create"
        initial={{ name: query }}
        onSubmit={async (input) => {
          const exercise = await createExercise(input);
          router.push(`/exercises/${exercise.id}`);
        }}
      />
    </Page>
  );
}
