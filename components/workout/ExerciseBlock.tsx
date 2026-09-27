"use client";

import { memo, useCallback, useMemo } from "react";
import { ArrowDown, ArrowUp, MoreHorizontal, Plus, SkipForward, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DraftExercise, DraftSet } from "@/lib/db/types";
import { cn } from "@/lib/utils";
import { LastSessionSummary } from "./LastSessionSummary";
import { setColumns, setGrid, SetRow } from "./SetRow";
import { kindOf } from "@/lib/workout/draftOps";
import { setProgress } from "@/lib/workout/progress";
import { formatDuration, formatWeight } from "@/lib/format";
import type { WeightUnit } from "@/lib/units";

export type ExerciseActions = {
  updateSet: (exId: string, setId: string, patch: Partial<Omit<DraftSet, "id">>) => void;
  addSet: (exId: string) => void;
  removeSet: (exId: string, setId: string) => void;
  setSkipped: (exId: string, skipped: boolean) => void;
  remove: (exId: string) => void;
  move: (exId: string, delta: -1 | 1) => void;
};

function ExerciseBlockImpl({
  exercise,
  index,
  isLast,
  actions,
  unit,
  mode = "live",
}: {
  exercise: DraftExercise;
  index: number;
  isLast: boolean;
  actions: ExerciseActions;
  unit: WeightUnit;
  /** "edit" is for fixing a finished workout: no last session, ticks or skipping. */
  mode?: "live" | "edit";
}) {
  const live = mode === "live";
  const { id } = exercise;
  const onChange = useCallback(
    (setId: string, patch: Partial<Omit<DraftSet, "id">>) => actions.updateSet(id, setId, patch),
    [actions, id],
  );
  const onRemove = useCallback((setId: string) => actions.removeSet(id, setId), [actions, id]);

  const done = exercise.sets.filter((s) => s.completed).length;
  const kind = kindOf(exercise);
  const trackIncline = kind === "timed" && !!exercise.trackIncline;

  // Hints for empty fields, from the first set of last session.
  const first = exercise.last?.sets[0];
  const placeholders = useMemo(() => {
    if (!first) return undefined;
    return kind === "timed"
      ? {
          a: first.duration_seconds ? formatDuration(first.duration_seconds) : undefined,
          b: first.incline != null ? String(first.incline) : undefined,
        }
      : {
          a: first.weight != null ? formatWeight(first.weight, unit) : undefined,
          b: first.reps != null ? String(first.reps) : undefined,
        };
  }, [first, kind, unit]);

  // "Beat last time" / PR markers, live workout only.
  const progress = useMemo(
    () => (live ? exercise.sets.map((_, i) => setProgress(exercise, i, unit)) : []),
    [live, exercise, unit],
  );

  const menu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-lg"
          className="-mr-2 size-10 shrink-0 text-muted-foreground"
          aria-label={`${exercise.name} options`}
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {live && !exercise.skipped && (
          <DropdownMenuItem className="h-10" onSelect={() => actions.setSkipped(id, true)}>
            <SkipForward /> Skip today
          </DropdownMenuItem>
        )}
        <DropdownMenuItem className="h-10" disabled={index === 0} onSelect={() => actions.move(id, -1)}>
          <ArrowUp /> Move up
        </DropdownMenuItem>
        <DropdownMenuItem className="h-10" disabled={isLast} onSelect={() => actions.move(id, 1)}>
          <ArrowDown /> Move down
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="h-10" variant="destructive" onSelect={() => actions.remove(id)}>
          <Trash2 /> {live ? "Remove from today" : "Remove"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  if (exercise.skipped) {
    return (
      <section className="flex items-center gap-3 py-4" aria-label={`${exercise.name} (skipped)`}>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-medium text-muted-foreground line-through decoration-muted-foreground/40">
            {exercise.name}
          </h2>
          <p className="text-xs text-muted-foreground">{live ? "Skipped today" : "Skipped"}</p>
        </div>
        <Button variant="secondary" className="h-9 px-3" onClick={() => actions.setSkipped(id, false)}>
          Undo
        </Button>
        {menu}
      </section>
    );
  }

  return (
    <section className="py-5" aria-label={exercise.name}>
      <div className="flex items-center gap-2">
        <h2 className="display min-w-0 flex-1 truncate text-lg">{exercise.name}</h2>
        {live && (
          <span className="numeric text-xs text-muted-foreground">
            {done}/{exercise.sets.length}
          </span>
        )}
        {menu}
      </div>

      {live && <LastSessionSummary exerciseId={exercise.exerciseId} last={exercise.last} unit={unit} />}

      <div className={live ? "mt-3" : "mt-2"}>
        <div className={cn(setGrid(kind, trackIncline, live), "mb-1 text-xs text-muted-foreground")}>
          <span className="text-center">Set</span>
          {setColumns(kind, trackIncline, unit).map((label) => (
            <span key={label} className="text-center">
              {label}
            </span>
          ))}
          {live && <span className="sr-only">Done</span>}
          <span className="sr-only">Remove</span>
        </div>
        <div className="flex flex-col gap-1.5">
          {exercise.sets.map((set, i) => (
            <SetRow
              key={set.id}
              index={i}
              set={set}
              kind={kind}
              trackIncline={trackIncline}
              unit={unit}
              showDone={live}
              delta={progress[i]?.delta}
              pr={progress[i]?.pr}
              placeholders={placeholders}
              onChange={onChange}
              onRemove={onRemove}
            />
          ))}
        </div>
        <Button
          variant="ghost"
          className="mt-1.5 -ml-2 h-10 px-2 text-sm font-medium text-foreground hover:bg-surface hover:text-foreground"
          onClick={() => actions.addSet(id)}
        >
          <Plus /> Add set
        </Button>
      </div>
    </section>
  );
}

export const ExerciseBlock = memo(ExerciseBlockImpl);
