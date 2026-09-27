import { newId } from "@/lib/id";
import type {
  ActiveSession,
  DraftExercise,
  DraftSet,
  ExerciseBest,
  ExerciseKind,
  LastSession,
  LoggedSet,
} from "@/lib/db/types";
import { formatDuration } from "@/lib/format";
import { fromKg, type WeightUnit } from "@/lib/units";

export const DEFAULT_SETS = 3;

const blankSet = (): DraftSet => ({
  id: newId(),
  weight: "",
  reps: "",
  duration: "",
  incline: "",
  completed: false,
});

/** A logged set as editable draft fields, with the weight shown in `unit`. */
export function toDraftSet(s: LoggedSet, unit: WeightUnit, completed = false): DraftSet {
  return {
    id: newId(),
    weight: s.weight == null ? "" : String(fromKg(s.weight, unit)),
    reps: s.reps == null ? "" : String(s.reps),
    duration: s.duration_seconds ? formatDuration(s.duration_seconds) : "",
    incline: s.incline == null ? "" : String(s.incline),
    weightKg: s.weight ?? undefined,
    completed,
  };
}

/**
 * Today's sets for one exercise: a copy of the previous session's sets, or
 * `defaultSets` blank rows when there is no history yet.
 */
export function prefillSets(
  last: LastSession | null,
  defaultSets = DEFAULT_SETS,
  unit: WeightUnit = "kg",
): DraftSet[] {
  if (last && last.sets.length > 0) return last.sets.map((s) => toDraftSet(s, unit));
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
  unit: WeightUnit = "kg",
  best: ExerciseBest | null = null,
): DraftExercise {
  return {
    id: newId(),
    exerciseId: exercise.id,
    name: exercise.name,
    kind: exercise.kind ?? "strength",
    trackIncline: exercise.track_incline ?? false,
    skipped: false,
    sets: prefillSets(last, defaultSets, unit),
    last,
    best,
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
  unit: WeightUnit = "kg",
  bests: Map<string, ExerciseBest> = new Map(),
): ActiveSession {
  return {
    key: "current",
    sessionId: newId(),
    templateId: source.templateId,
    name: source.name,
    startedAt: now.toISOString(),
    updatedAt: now.toISOString(),
    weightUnit: unit,
    exercises: source.exercises.map((e) =>
      buildDraftExercise(e, lastSessions.get(e.id) ?? null, e.defaultSets, unit, bests.get(e.id) ?? null),
    ),
  };
}
