import type { ActiveSession, Exercise, ExerciseKind, SessionDetail } from "@/lib/db/types";
import type { WeightUnit } from "@/lib/units";
import { toDraftSet } from "./buildSession";

/**
 * Turn a finished workout into an editable draft, so the live workout's
 * blocks and draft operations can be reused. Only the id, name and exercises
 * matter when saving; the times are kept on the server.
 */
export function detailToDraft(
  detail: SessionDetail,
  exercises: Map<string, Pick<Exercise, "kind" | "track_incline">>,
  unit: WeightUnit,
): ActiveSession {
  return {
    key: "current",
    sessionId: detail.id,
    templateId: null,
    name: detail.name,
    startedAt: detail.completed_at,
    weightUnit: unit,
    exercises: detail.exercises.map((e) => {
      const ex = exercises.get(e.exercise_id);
      // Fall back to the sets themselves if the exercise isn't cached.
      const timed = e.sets.some((s) => s.duration_seconds);
      const kind: ExerciseKind = ex?.kind ?? (timed ? "timed" : "strength");
      return {
        id: e.id,
        exerciseId: e.exercise_id,
        name: e.name,
        kind,
        trackIncline: ex ? ex.track_incline : e.sets.some((s) => s.incline != null),
        skipped: e.skipped,
        // Saved sets were done, so they're kept ticked.
        sets: e.sets.map((s) => toDraftSet(s, unit, true)),
        last: null,
      };
    }),
  };
}
