"use client";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { ActiveSession } from "@/lib/db/types";
import { finishChoice, summarize, type SaveMode } from "@/lib/workout/draftOps";
import { pluralize } from "@/lib/format";

/**
 * Confirms finishing. If some logged sets were worked on (ticked or edited)
 * and others are untouched pre-fills, asks whether to save everything or only
 * the sets the user did — numbers never touched shouldn't silently land in history.
 */
export function FinishDialog({
  open,
  onOpenChange,
  session,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: ActiveSession;
  onSave: (mode: SaveMode) => void;
}) {
  const choice = finishChoice(session);
  const { exercises, loggedSets, tickedLogged, untickedLogged } = summarize(session);

  const save = (mode: SaveMode) => {
    onOpenChange(false);
    onSave(mode);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="display text-lg">
            {choice === "empty"
              ? "No sets logged"
              : choice === "mixed"
                ? `${pluralize(untickedLogged, "set")} left untouched`
                : "Finish workout?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {choice === "empty"
              ? "Enter reps for at least one set, or discard this workout from the menu."
              : choice === "mixed"
                ? `You updated or ticked ${tickedLogged} of ${loggedSets} sets. The rest still show last session’s numbers. Save all ${loggedSets}, or only the ${tickedLogged} you did?`
                : `${pluralize(exercises, "exercise")} · ${pluralize(loggedSets, "set")} will be saved.`}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-2">
          {choice === "mixed" && (
            <>
              <Button size="cta" onClick={() => save("ticked")}>
                Only the {tickedLogged} I did
              </Button>
              <Button size="cta" variant="secondary" onClick={() => save("all")}>
                Save all {loggedSets} sets
              </Button>
            </>
          )}
          {choice === "simple" && (
            <Button size="cta" onClick={() => save("all")}>
              Save workout
            </Button>
          )}
          <Button variant="ghost" className="h-11" onClick={() => onOpenChange(false)}>
            {choice === "empty" ? "OK" : "Keep going"}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
