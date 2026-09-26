import { newId } from "@/lib/id";
import type { ActiveSession, DraftExercise, DraftSet, ExerciseKind } from "@/lib/db/types";
import type { SaveSessionPayload } from "@/lib/repositories/sessions";

// Pure, immutable operations on the active workout draft. They only affect
// today's session; templates are never modified.

type Ex = (e: DraftExercise) => DraftExercise;

function mapExercise(s: ActiveSession, exId: string, fn: Ex): ActiveSession {
  return { ...s, exercises: s.exercises.map((e) => (e.id === exId ? fn(e) : e)) };
}

/** Drafts created before timed exercises existed have no kind: they are strength. */
export const kindOf = (e: Pick<DraftExercise, "kind">): ExerciseKind => e.kind ?? "strength";

export function updateSet(
  s: ActiveSession,
  exId: string,
  setId: string,
  patch: Partial<Omit<DraftSet, "id">>,
): ActiveSession {
  return mapExercise(s, exId, (e) => ({
    ...e,
    sets: e.sets.map((set) => {
      if (set.id !== setId) return set;
      const next = { ...set, ...patch };
      // Any real value change marks the set as worked on (re-typing the same value doesn't).
      const changed = VALUE_FIELDS.some((f) => (next[f] ?? "") !== (set[f] ?? ""));
      return changed ? { ...next, touched: true } : next;
    }),
  }));
}

const VALUE_FIELDS = ["weight", "reps", "duration", "incline"] as const;

/** Did the user work on this set: ticked it, changed it, or added it? */
export const isDoneSet = (set: DraftSet) => set.completed || !!set.touched;

/** Adds a set, copying the previous set's values for quick entry. */
export function addSet(s: ActiveSession, exId: string): ActiveSession {
  return mapExercise(s, exId, (e) => {
    const prev = e.sets[e.sets.length - 1];
    const set: DraftSet = {
      id: newId(),
      weight: prev?.weight ?? "",
      reps: prev?.reps ?? "",
      duration: prev?.duration ?? "",
      incline: prev?.incline ?? "",
      completed: false,
      // Added deliberately, so it counts as worked on.
      touched: true,
    };
    return { ...e, sets: [...e.sets, set] };
  });
}

export function removeSet(s: ActiveSession, exId: string, setId: string): ActiveSession {
  return mapExercise(s, exId, (e) => ({ ...e, sets: e.sets.filter((x) => x.id !== setId) }));
}

export function setSkipped(s: ActiveSession, exId: string, skipped: boolean): ActiveSession {
  return mapExercise(s, exId, (e) => ({ ...e, skipped }));
}

export function removeExercise(s: ActiveSession, exId: string): ActiveSession {
  return { ...s, exercises: s.exercises.filter((e) => e.id !== exId) };
}

export function addExercise(s: ActiveSession, exercise: DraftExercise): ActiveSession {
  return { ...s, exercises: [...s.exercises, exercise] };
}

export function moveExercise(s: ActiveSession, exId: string, delta: -1 | 1): ActiveSession {
  const i = s.exercises.findIndex((e) => e.id === exId);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= s.exercises.length) return s;
  const exercises = [...s.exercises];
  [exercises[i], exercises[j]] = [exercises[j], exercises[i]];
  return { ...s, exercises };
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/** Parse "27,5" / "27.5" / "" → number | null. */
export function parseWeight(v: string): number | null {
  const t = v.trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
}

export function parseReps(v: string): number | null {
  const t = v.trim();
  if (t === "") return null;
  const n = Number.parseInt(t, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * Duration typed as minutes: "30" → 30 min, "30:15" / "30.15" → 30 min 15 s,
 * "1:05:00" → 1 h 5 min. ("." is accepted because phone number pads lack ":".)
 */
export function parseDuration(v: string | undefined): number | null {
  const t = (v ?? "").trim().replace(/[.,]/g, ":");
  if (t === "") return null;
  const parts = t.split(":");
  if (parts.length > 3 || parts.some((p) => !/^\d+$/.test(p))) return null;
  const n = parts.map(Number);
  const seconds =
    n.length === 3 ? n[0] * 3600 + n[1] * 60 + n[2] : n.length === 2 ? n[0] * 60 + n[1] : n[0] * 60;
  return seconds > 0 ? seconds : null;
}

/** Incline in %, e.g. "8" / "8.5" / "-2". */
export function parseIncline(v: string | undefined): number | null {
  const t = (v ?? "").trim().replace(",", ".");
  if (t === "" || t === "-") return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= -20 && n <= 100 ? Math.round(n * 10) / 10 : null;
}

/**
 * A set counts as logged once it has its main measure:
 * reps for strength (weight may be empty = bodyweight), duration for timed.
 */
export function isLoggedSet(set: DraftSet, kind: ExerciseKind = "strength"): boolean {
  if (kind === "timed") return parseDuration(set.duration) !== null;
  const reps = parseReps(set.reps);
  return reps !== null && reps > 0;
}

// ---------------------------------------------------------------------------
// Finishing
// ---------------------------------------------------------------------------

export function summarize(s: ActiveSession) {
  const active = s.exercises.filter((e) => !e.skipped);
  let loggedSets = 0;
  let totalSets = 0;
  let doneSets = 0;
  // Logged sets split by whether they were worked on (ticked or edited) — drives the Finish question.
  let tickedLogged = 0;
  for (const e of active) {
    const kind = kindOf(e);
    for (const set of e.sets) {
      totalSets++;
      if (set.completed) doneSets++;
      if (isLoggedSet(set, kind)) {
        loggedSets++;
        if (isDoneSet(set)) tickedLogged++;
      }
    }
  }
  return {
    exercises: active.length,
    loggedSets,
    totalSets,
    doneSets,
    tickedLogged,
    untickedLogged: loggedSets - tickedLogged,
  };
}

export type SaveMode = "all" | "ticked";

/**
 * What Finish should ask:
 * - "empty": nothing to save
 * - "simple": every logged set was ticked/edited, or none were → save everything
 * - "mixed": some logged sets worked on and some untouched → ask all vs. only those
 */
export function finishChoice(s: ActiveSession): "empty" | "simple" | "mixed" {
  const { loggedSets, tickedLogged, untickedLogged } = summarize(s);
  if (loggedSets === 0) return "empty";
  return tickedLogged > 0 && untickedLogged > 0 ? "mixed" : "simple";
}

/**
 * Turn the draft into the save_session payload. Exercises that were skipped or
 * have no kept sets are stored as "skipped" so the snapshot stays honest.
 * mode "ticked" keeps only sets the user worked on (ticked or edited).
 */
export function toSavePayload(
  s: ActiveSession,
  completedAt = new Date(),
  mode: SaveMode = "all",
): SaveSessionPayload {
  return {
    id: s.sessionId,
    template_id: s.templateId,
    name: s.name,
    started_at: s.startedAt,
    completed_at: completedAt.toISOString(),
    exercises: s.exercises.map((e, position) => {
      const kind = kindOf(e);
      const keep = (set: DraftSet) => isLoggedSet(set, kind) && (mode === "all" || isDoneSet(set));
      const sets = e.skipped
        ? []
        : e.sets.filter(keep).map((set, i) =>
            kind === "timed"
              ? {
                  set_number: i + 1,
                  weight: null,
                  reps: null,
                  duration_seconds: parseDuration(set.duration),
                  incline: e.trackIncline ? parseIncline(set.incline) : null,
                  completed: set.completed,
                }
              : {
                  set_number: i + 1,
                  weight: parseWeight(set.weight),
                  reps: parseReps(set.reps),
                  duration_seconds: null,
                  incline: null,
                  completed: set.completed,
                },
          );
      return {
        id: e.id,
        exercise_id: e.exerciseId,
        position,
        status: sets.length > 0 ? "completed" : "skipped",
        sets,
      };
    }),
  };
}
