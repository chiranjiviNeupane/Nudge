"use client";

import { memo } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DraftSet, ExerciseKind } from "@/lib/db/types";
import { formatDuration } from "@/lib/format";
import { parseDuration } from "@/lib/workout/draftOps";
import type { WeightUnit } from "@/lib/units";
import { focusNextField, stepField } from "./setFields";

/** Column layout shared by the header row and each set row. `showDone` adds the tick column. */
export function setGrid(kind: ExerciseKind, trackIncline: boolean, showDone = true) {
  const twoFields = kind === "strength" || trackIncline;
  const cols = {
    "two-done": "grid-cols-[1.75rem_1fr_1fr_3rem_2.5rem]",
    "one-done": "grid-cols-[1.75rem_1fr_3rem_2.5rem]",
    two: "grid-cols-[1.75rem_1fr_1fr_2.5rem]",
    one: "grid-cols-[1.75rem_1fr_2.5rem]",
  } as const;
  return cn("grid items-center gap-2", cols[`${twoFields ? "two" : "one"}${showDone ? "-done" : ""}`]);
}

/** Header labels for the value columns. */
export function setColumns(kind: ExerciseKind, trackIncline: boolean, unit: WeightUnit): string[] {
  if (kind === "strength") return [unit, "Reps"];
  return trackIncline ? ["Time", "Incline %"] : ["Time"];
}

type Props = {
  index: number;
  set: DraftSet;
  kind: ExerciseKind;
  trackIncline: boolean;
  unit: WeightUnit;
  /** The done tick is for the live workout; editing a finished one hides it. */
  showDone: boolean;
  /** "+2.5 kg" when this set beats the same set last time (live workout only). */
  delta?: string | null;
  /** Beats the all-time best. */
  pr?: boolean;
  /** Hints shown when a field is empty (from the first set of last session). */
  placeholders?: { a?: string; b?: string };
  onChange: (setId: string, patch: Partial<Omit<DraftSet, "id">>) => void;
  onRemove: (setId: string) => void;
};

function SetRowImpl({
  index,
  set,
  kind,
  trackIncline,
  unit,
  showDone,
  delta,
  pr,
  placeholders,
  onChange,
  onRemove,
}: Props) {
  const done = showDone && set.completed;
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      focusNextField(e.currentTarget);
    } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      stepField(e.currentTarget, e.key === "ArrowUp" ? 1 : -1);
    }
  };

  const inputClass = cn(
    "numeric h-12 w-full min-w-0 rounded-xl bg-surface text-center text-xl outline-none ring-inset transition-shadow placeholder:font-normal placeholder:text-muted-foreground/40 focus-visible:ring-2 focus-visible:ring-primary",
  );

  const common = {
    type: "text",
    enterKeyHint: "next" as const,
    autoComplete: "off",
    className: inputClass,
    onFocus: (e: React.FocusEvent<HTMLInputElement>) => e.currentTarget.select(),
    onKeyDown,
  };
  const n = index + 1;

  return (
    <div className={setGrid(kind, trackIncline, showDone)}>
      <span
        className={cn("numeric text-center text-sm", done ? "text-foreground" : "text-muted-foreground")}
      >
        {n}
      </span>

      {kind === "strength" ? (
        <>
          <input
            {...common}
            data-set-field="weight"
            data-unit={unit}
            inputMode="decimal"
            aria-label={`Set ${n} weight in ${unit}`}
            value={set.weight}
            placeholder={placeholders?.a ?? "0"}
            onChange={(e) => onChange(set.id, { weight: e.target.value.replace(/[^\d.,]/g, "") })}
          />
          <input
            {...common}
            data-set-field="reps"
            inputMode="numeric"
            aria-label={`Set ${n} reps`}
            value={set.reps}
            placeholder={placeholders?.b ?? "0"}
            onChange={(e) => onChange(set.id, { reps: e.target.value.replace(/\D/g, "").slice(0, 4) })}
          />
        </>
      ) : (
        <>
          <input
            {...common}
            data-set-field="duration"
            inputMode="decimal"
            aria-label={`Set ${n} time in minutes (mm:ss)`}
            value={set.duration ?? ""}
            placeholder={placeholders?.a ?? "min"}
            onChange={(e) => onChange(set.id, { duration: e.target.value.replace(/[^\d:.,]/g, "").slice(0, 8) })}
            // Normalize "30" → "30:00" so it's clear what was understood.
            onBlur={(e) => {
              const secs = parseDuration(e.target.value);
              if (secs) onChange(set.id, { duration: formatDuration(secs) });
            }}
          />
          {trackIncline && (
            <input
              {...common}
              data-set-field="incline"
              inputMode="decimal"
              aria-label={`Set ${n} incline in percent`}
              value={set.incline ?? ""}
              placeholder={placeholders?.b ?? "%"}
              onChange={(e) => onChange(set.id, { incline: e.target.value.replace(/[^\d.,-]/g, "").slice(0, 5) })}
            />
          )}
        </>
      )}

      {showDone && (
        <button
          type="button"
          aria-label={set.completed ? `Mark set ${n} not done` : `Mark set ${n} done`}
          aria-pressed={set.completed}
          onClick={() => {
            // A tiny tap of feedback when ticking off (Android; iOS ignores it).
            if (!set.completed) navigator.vibrate?.(12);
            onChange(set.id, { completed: !set.completed });
          }}
          className={cn(
            "flex h-12 w-full items-center justify-center rounded-xl outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary",
            set.completed
              ? "bg-foreground text-background motion-safe:animate-tick-pop"
              : "bg-surface text-muted-foreground/50 hover:text-foreground",
          )}
        >
          <Check className="size-5" strokeWidth={2.5} />
        </button>
      )}
      <button
        type="button"
        aria-label={`Remove set ${n}`}
        onClick={() => onRemove(set.id)}
        className="flex h-12 w-full items-center justify-center rounded-xl text-muted-foreground/40 outline-none hover:bg-surface hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary"
      >
        <X className="size-4" />
      </button>

      {(delta || pr) && (
        <p className="col-span-full -mt-1 flex items-center gap-2 pl-9 text-xs font-medium text-success">
          {delta && <span>↑ {delta} vs last</span>}
          {pr && (
            <span className="rounded-sm bg-gold px-1.5 py-px text-[10px] font-semibold tracking-wide text-gold-foreground motion-safe:animate-pr-pulse">
              PR
            </span>
          )}
        </p>
      )}
    </div>
  );
}

export const SetRow = memo(SetRowImpl);
