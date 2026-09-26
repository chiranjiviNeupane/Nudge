"use client";

import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { useExercises } from "@/lib/hooks/data";
import { createExercise, type ExerciseInput } from "@/lib/repositories/exercises";
import { ExerciseDialog } from "./ExerciseDialog";
import type { Exercise } from "@/lib/db/types";

/**
 * Searchable exercise list with inline "Create …". Shared by the template
 * editor and the live workout's "Add exercise".
 */
export function ExercisePicker({
  excludeIds = [],
  onPick,
}: {
  excludeIds?: string[];
  onPick: (exercise: Exercise) => void | Promise<void>;
}) {
  const exercises = useExercises();
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);

  const q = query.trim().toLowerCase();
  const excluded = useMemo(() => new Set(excludeIds), [excludeIds]);
  const matches = (exercises ?? []).filter(
    (e) => !excluded.has(e.id) && (!q || e.name.toLowerCase().includes(q)),
  );
  const exactExists = (exercises ?? []).some((e) => e.name.toLowerCase() === q);

  async function pick(exercise: Exercise) {
    setBusy(true);
    try {
      await onPick(exercise);
    } finally {
      setBusy(false);
    }
  }

  // New exercises go through the full dialog so the type (strength/timed) is chosen up front.
  const create = () => setCreating(true);

  async function submitNew(input: ExerciseInput) {
    const exercise = await createExercise(input);
    try {
      await onPick(exercise);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add exercise");
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            if (matches.length > 0) void pick(matches[0]);
            else if (q && !exactExists) void create();
          }}
          placeholder="Search or create…"
          className="h-12 rounded-xl border-0 bg-surface pl-10 text-base md:text-base"
          aria-label="Search exercises"
        />
      </div>
      <ul className="-mx-2 min-h-40 flex-1 overflow-y-auto">
        {q && !exactExists && (
          <li>
            <button
              type="button"
              disabled={busy}
              onClick={create}
              className="flex h-11 w-full items-center gap-2 rounded-lg px-2 text-left text-sm font-medium text-primary outline-none hover:bg-muted focus-visible:bg-muted"
            >
              <Plus className="size-4" />
              Create “{query.trim()}”
            </button>
          </li>
        )}
        {matches.map((e) => (
          <li key={e.id}>
            <button
              type="button"
              disabled={busy}
              onClick={() => pick(e)}
              className="flex h-11 w-full items-center rounded-lg px-2 text-left text-base outline-none hover:bg-muted focus-visible:bg-muted"
            >
              {e.name}
            </button>
          </li>
        ))}
        {exercises && matches.length === 0 && !q && (
          <li className="px-2 py-6 text-center text-sm text-muted-foreground">
            Type a name to create your first exercise.
          </li>
        )}
      </ul>

      <ExerciseDialog
        open={creating}
        onOpenChange={setCreating}
        title="New exercise"
        submitLabel="Create and add"
        initial={{ name: query.trim() }}
        onSubmit={submitNew}
      />
    </div>
  );
}
