"use client";

import { useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import type { ActiveSession } from "@/lib/db/types";
import * as ops from "@/lib/workout/draftOps";
import type { ExerciseActions } from "./ExerciseBlock";

/**
 * Stable ExerciseBlock actions over a draft held in React state. Used by the
 * live workout and by editing a finished one. `afterEdit` runs on every change
 * (the live workout stamps updatedAt with it).
 */
export function useDraftActions(
  session: ActiveSession | null | undefined,
  setSession: React.Dispatch<React.SetStateAction<ActiveSession | null | undefined>>,
  afterEdit: (s: ActiveSession) => ActiveSession = (s) => s,
): ExerciseActions {
  // Latest session for the stable actions below, which need to know what's being removed.
  const sessionRef = useRef(session);
  const afterEditRef = useRef(afterEdit);
  useEffect(() => {
    sessionRef.current = session;
    afterEditRef.current = afterEdit;
  });

  return useMemo(() => {
    const apply = (fn: (s: ActiveSession) => ActiveSession) =>
      setSession((s) => (s ? afterEditRef.current(fn(s)) : s));
    // Removals happen at once; the toast offers a way back. One shared id so
    // only the latest removal's toast is on screen.
    const offerUndo = (message: string, undo: () => void) =>
      toast(message, { id: "workout-undo", action: { label: "Undo", onClick: undo } });

    return {
      updateSet: (exId, setId, patch) => apply((s) => ops.updateSet(s, exId, setId, patch)),
      addSet: (exId) => apply((s) => ops.addSet(s, exId)),
      removeSet: (exId, setId) => {
        const exercise = sessionRef.current?.exercises.find((e) => e.id === exId);
        const index = exercise?.sets.findIndex((x) => x.id === setId) ?? -1;
        apply((s) => ops.removeSet(s, exId, setId));
        if (!exercise || index < 0) return;
        const set = exercise.sets[index];
        offerUndo(`Removed set ${index + 1} · ${exercise.name}`, () =>
          apply((s) => ops.insertSet(s, exId, set, index)),
        );
      },
      setSkipped: (exId, skipped) => apply((s) => ops.setSkipped(s, exId, skipped)),
      remove: (exId) => {
        const exercises = sessionRef.current?.exercises ?? [];
        const index = exercises.findIndex((e) => e.id === exId);
        apply((s) => ops.removeExercise(s, exId));
        if (index < 0) return;
        const exercise = exercises[index];
        offerUndo(`Removed ${exercise.name}`, () => apply((s) => ops.insertExercise(s, exercise, index)));
      },
      move: (exId, delta) => apply((s) => ops.moveExercise(s, exId, delta)),
    };
  }, [setSession]);
}
