"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ResponsiveModal } from "@/components/common/ResponsiveModal";
import type { ExerciseInput } from "@/lib/repositories/exercises";
import { cn } from "@/lib/utils";

const KINDS = [
  { value: "strength", label: "Strength", hint: "Weight × reps" },
  { value: "timed", label: "Timed", hint: "Duration, e.g. treadmill, plank" },
] as const;

/** Create or edit an exercise: name, type, and (for timed) incline tracking. */
export function ExerciseDialog({
  open,
  onOpenChange,
  title,
  initial,
  submitLabel = "Save",
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  initial?: Partial<ExerciseInput>;
  submitLabel?: string;
  /** Resolve to close; throw to keep the dialog open and show the error. */
  onSubmit: (input: ExerciseInput) => Promise<void>;
}) {
  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange} title={title}>
      {/* Remount on open so fields reset to `initial`. */}
      {open && (
        <ExerciseForm
          initial={initial}
          submitLabel={submitLabel}
          onSubmit={async (input) => {
            await onSubmit(input);
            onOpenChange(false);
          }}
        />
      )}
    </ResponsiveModal>
  );
}

function ExerciseForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: Partial<ExerciseInput>;
  submitLabel: string;
  onSubmit: (input: ExerciseInput) => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [kind, setKind] = useState<ExerciseInput["kind"]>(initial?.kind ?? "strength");
  const [trackIncline, setTrackIncline] = useState(initial?.trackIncline ?? false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="flex flex-col gap-5 pt-2"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        setPending(true);
        setError(null);
        try {
          await onSubmit({ name, kind, trackIncline });
        } catch (err) {
          setError(err instanceof Error ? err.message : "Something went wrong.");
          setPending(false);
        }
      }}
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="exercise-name">Name</Label>
        <Input
          id="exercise-name"
          autoFocus
          value={name}
          placeholder="e.g. Bench Press"
          onChange={(e) => setName(e.target.value)}
          className="h-12 rounded-xl border-0 bg-surface px-4 text-base md:text-base"
          maxLength={100}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label id="exercise-kind">Type</Label>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-labelledby="exercise-kind">
          {KINDS.map((k) => (
            <button
              key={k.value}
              type="button"
              role="radio"
              aria-checked={kind === k.value}
              onClick={() => setKind(k.value)}
              className={cn(
                "rounded-xl px-3 py-2.5 text-left outline-none ring-inset transition-colors focus-visible:ring-2 focus-visible:ring-primary",
                kind === k.value ? "bg-primary/10 ring-2 ring-primary" : "bg-surface hover:bg-surface-2",
              )}
            >
              <span className="block text-sm font-medium">{k.label}</span>
              <span className="block text-xs text-muted-foreground">{k.hint}</span>
            </button>
          ))}
        </div>
      </div>

      {kind === "timed" && (
        <button
          type="button"
          role="switch"
          aria-checked={trackIncline}
          onClick={() => setTrackIncline((v) => !v)}
          className="flex items-center justify-between gap-3 rounded-xl bg-surface px-4 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <span>
            <span className="block text-sm font-medium">Track incline</span>
            <span className="block text-xs text-muted-foreground">
              For treadmill, hill or stair climbs. Leave off for planks.
            </span>
          </span>
          <span
            aria-hidden
            className={cn(
              "relative h-6 w-10 shrink-0 rounded-full transition-colors",
              trackIncline ? "bg-primary" : "bg-input",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 size-5 rounded-full bg-white shadow transition-[left]",
                trackIncline ? "left-[18px]" : "left-0.5",
              )}
            />
          </span>
        </button>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" size="cta" disabled={pending || !name.trim()}>
        {submitLabel}
      </Button>
    </form>
  );
}
