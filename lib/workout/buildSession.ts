import { newId } from "@/lib/id";
import type { ActiveSession, DraftExercise, DraftSet, ExerciseKind, LastSession } from "@/lib/db/types";
import { formatDuration } from "@/lib/format";

export const DEFAULT_SETS = 3;

const blankSet = (): DraftSet => ({
  id: newId(),
  weight: "",
  reps: "",
  duration: "",
  incline: "",
  completed: false,
});

/**
 * Today's sets for one exercise: a copy of the previous session's sets, or
 * `defaultSets` blank rows when there is no history yet.
 */
export function prefillSets(last: LastSession | null, defaultSets = DEFAULT_SETS): DraftSet[] {
  if (last && last.sets.length > 0) {
    return last.sets.map((s) => ({
      id: newId(),
      weight: s.weight == null ? "" : String(s.weight),
      reps: s.reps == null ? "" : String(s.reps),
      duration: s.duration_seconds ? formatDuration(s.duration_seconds) : "",
      incline: s.incline == null ? "" : String(s.incline),
      completed: false,
    }));
  }
  return Array.from({ length: Math.max(1, defaultSets) }, blankSet);
}

export type DraftSource = {
  id: string;
  name: string;
  kind?: ExerciseKind;
  track_incline?: boolean;
};

export function buildDraftExercise(
  exercise: DraftSource,
  last: LastSession | null,
  defaultSets = DEFAULT_SETS,
): DraftExercise {
  return {
    id: newId(),
    exerciseId: exercise.id,
    name: exercise.name,
    kind: exercise.kind ?? "strength",
    trackIncline: exercise.track_incline ?? false,
    skipped: false,
    sets: prefillSets(last, defaultSets),
    last,
  };
}

export type SessionSource = {
  templateId: string | null;
  name: string;
  exercises: (DraftSource & { defaultSets: number })[];
};

/** Build a fresh workout draft. Never touches the template itself. */
export function buildSession(
  source: SessionSource,
  lastSessions: Map<string, LastSession>,
  now = new Date(),
): ActiveSession {
  return {
    key: "current",
    sessionId: newId(),
    templateId: source.templateId,
    name: source.name,
    startedAt: now.toISOString(),
    updatedAt: now.toISOString(),
    exercises: source.exercises.map((e) =>
      buildDraftExercise(e, lastSessions.get(e.id) ?? null, e.defaultSets),
    ),
  };
}
