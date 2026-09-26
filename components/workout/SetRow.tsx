"use client";

import { memo } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DraftSet, ExerciseKind } from "@/lib/db/types";
import { formatDuration } from "@/lib/format";
import { parseDuration } from "@/lib/workout/draftOps";

/** Column layout shared by the header row and each set row. */
export function setGrid(kind: ExerciseKind, trackIncline: boolean) {
  const twoFields = kind === "strength" || trackIncline;
  return cn(
    "grid items-center gap-2",
    twoFields ? "grid-cols-[1.75rem_1fr_1fr_3rem_2rem]" : "grid-cols-[1.75rem_1fr_3rem_2rem]",
  );
}

/** Header labels for the value columns. */
export function setColumns(kind: ExerciseKind, trackIncline: boolean): string[] {
  if (kind === "strength") return ["kg", "Reps"];
  return trackIncline ? ["Time", "Incline %"] : ["Time"];
}

type Props = {
  index: number;
  set: DraftSet;
  kind: ExerciseKind;
  trackIncline: boolean;
  /** Hints shown when a field is empty (from the first set of last session). */
  placeholders?: { a?: string; b?: string };
  onChange: (setId: string, patch: Partial<Omit<DraftSet, "id">>) => void;
  onRemove: (setId: string) => void;
};

/** Moves focus to the next set field (Enter key), in document order. */
function focusNextField(current: HTMLElement) {
  const fields = Array.from(document.querySelectorAll<HTMLInputElement>("[data-set-field]"));
  const next = fields[fields.indexOf(current as HTMLInputElement) + 1];
  if (next) next.focus();
  else current.blur();
}

function SetRowImpl({ index, set, kind, trackIncline, placeholders, onChange, onRemove }: Props) {
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      focusNextField(e.currentTarget);
    }
  };

  const inputClass = cn(
    "numeric h-12 w-full min-w-0 rounded-xl bg-surface text-center text-xl outline-none ring-inset transition-shadow placeholder:font-normal placeholder:text-muted-foreground/40 focus-visible:ring-2 focus-visible:ring-primary",
    set.completed && "bg-primary/10",
  );

  const common = {
    "data-set-field": true,
    type: "text",
    enterKeyHint: "next" as const,
    autoComplete: "off",
    className: inputClass,
    onFocus: (e: React.FocusEvent<HTMLInputElement>) => e.currentTarget.select(),
    onKeyDown,
  };
  const n = index + 1;

  return (
    <div className={setGrid(kind, trackIncline)}>
      <span
        className={cn("numeric text-center text-sm", set.completed ? "text-primary" : "text-muted-foreground")}
      >
        {n}
      </span>

      {kind === "strength" ? (
        <>
          <input
            {...common}
            inputMode="decimal"
            aria-label={`Set ${n} weight in kg`}
            value={set.weight}
            placeholder={placeholders?.a ?? "0"}
            onChange={(e) => onChange(set.id, { weight: e.target.value.replace(/[^\d.,]/g, "") })}
          />
          <input
            {...common}
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
              inputMode="decimal"
              aria-label={`Set ${n} incline in percent`}
              value={set.incline ?? ""}
              placeholder={placeholders?.b ?? "%"}
              onChange={(e) => onChange(set.id, { incline: e.target.value.replace(/[^\d.,-]/g, "").slice(0, 5) })}
            />
          )}
        </>
      )}

      <button
        type="button"
        aria-label={set.completed ? `Mark set ${n} not done` : `Mark set ${n} done`}
        aria-pressed={set.completed}
        onClick={() => onChange(set.id, { completed: !set.completed })}
        className={cn(
          "flex h-12 w-full items-center justify-center rounded-xl outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary",
          set.completed
            ? "bg-primary text-primary-foreground"
            : "bg-surface text-muted-foreground/50 hover:text-foreground",
        )}
      >
        <Check className="size-5" strokeWidth={2.5} />
      </button>
      <button
        type="button"
        aria-label={`Remove set ${n}`}
        onClick={() => onRemove(set.id)}
        className="flex size-8 items-center justify-center rounded-lg text-muted-foreground/40 outline-none hover:bg-surface hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

export const SetRow = memo(SetRowImpl);
