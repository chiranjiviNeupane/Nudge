import type { ActiveSession, DraftExercise, DraftSet, ExerciseBest, HistoryEntry, LoggedSet } from "@/lib/db/types";
import type { SaveSessionPayload } from "@/lib/repositories/sessions";
import { formatDuration, formatSet } from "@/lib/format";
import { fromKg, type WeightUnit } from "@/lib/units";
import { draftWeightKg, isLoggedSet, kindOf, parseDuration, parseReps } from "./draftOps";

// "Beat last time" and personal-record (PR) logic. Pure, so the live workout
// and the finish summary agree. Weights are compared in kg.

/** Estimated one-rep max (Epley). Matches get_exercise_bests in schema.sql. */
export function e1rm(weightKg: number, reps: number): number {
  return reps === 1 ? weightKg : weightKg * (1 + reps / 30);
}

/** One set's measure: weight (kg, null = bodyweight) × reps, or a duration. */
type Measure = { weight: number | null; reps: number | null; duration: number | null };

const fromLogged = (s: LoggedSet): Measure => ({
  weight: s.weight,
  reps: s.reps,
  duration: s.duration_seconds ?? null,
});

function fromDraft(set: DraftSet, e: DraftExercise, unit: WeightUnit): Measure | null {
  if (!isLoggedSet(set, kindOf(e))) return null;
  return kindOf(e) === "timed"
    ? { weight: null, reps: null, duration: parseDuration(set.duration) }
    : { weight: draftWeightKg(set, unit), reps: parseReps(set.reps), duration: null };
}

const pluralReps = (n: number) => `+${n} rep${n === 1 ? "" : "s"}`;

/** "+2.5 kg" / "+1 rep" / "+0:30" when `cur` beats `prev`, else null. */
function improvement(cur: Measure, prev: Measure | null, unit: WeightUnit): string | null {
  if (!prev) return null;
  if (cur.duration != null) {
    return prev.duration != null && cur.duration > prev.duration
      ? `+${formatDuration(cur.duration - prev.duration)}`
      : null;
  }
  if (cur.reps == null) return null;
  if (cur.weight != null && prev.weight != null && cur.weight > prev.weight) {
    const diff = Math.round((fromKg(cur.weight, unit) - fromKg(prev.weight, unit)) * 10) / 10;
    return diff > 0 ? `+${diff} ${unit}` : null;
  }
  return cur.weight === prev.weight && prev.reps != null && cur.reps > prev.reps ? pluralReps(cur.reps - prev.reps) : null;
}

/** Beats the all-time best? Needs history: a first-ever set isn't a PR. */
function isPR(cur: Measure, best: ExerciseBest | null | undefined): boolean {
  if (!best) return false;
  const EPS = 0.005; // best_e1rm is rounded to 2 decimals
  if (cur.duration != null) return best.best_duration != null && cur.duration > best.best_duration;
  if (cur.reps == null || cur.reps <= 0) return false;
  if (cur.weight == null || cur.weight === 0) return best.best_reps != null && cur.reps > best.best_reps;
  return best.best_e1rm != null && e1rm(cur.weight, cur.reps) > best.best_e1rm + EPS;
}

export type SetProgress = { delta: string | null; pr: boolean };

/** Markers for one set in the live workout, compared with the same set last time. */
export function setProgress(e: DraftExercise, index: number, unit: WeightUnit): SetProgress {
  const cur = fromDraft(e.sets[index], e, unit);
  if (!cur) return { delta: null, pr: false };
  const prev = e.last?.sets[index];
  return { delta: improvement(cur, prev ? fromLogged(prev) : null, unit), pr: isPR(cur, e.best) };
}

// ---------------------------------------------------------------------------
// Finish summary
// ---------------------------------------------------------------------------

export type FinishSummary = {
  sessionId: string;
  name: string;
  unit: WeightUnit;
  exercises: number;
  sets: number;
  /** Sum of weight × reps, in `unit`. Bodyweight and timed sets don't count. */
  volume: number;
  /** Sets that beat the same set last time. */
  improved: number;
  /** One line per exercise that set a PR, with its best set. */
  prs: { exercise: string; set: string }[];
};

/** Stats for the screen shown after Finish, from what was actually saved. */
export function summarizeFinish(session: ActiveSession, payload: SaveSessionPayload): FinishSummary {
  const unit = session.weightUnit ?? "kg";
  const drafts = new Map(session.exercises.map((e) => [e.id, e]));
  let sets = 0;
  let volumeKg = 0;
  let improved = 0;
  const prs: FinishSummary["prs"] = [];

  for (const saved of payload.exercises) {
    if (saved.status !== "completed") continue;
    const draft = drafts.get(saved.id);
    let top: { score: number; set: LoggedSet } | null = null;
    for (const s of saved.sets) {
      sets++;
      if (s.weight && s.reps) volumeKg += s.weight * s.reps;
      const logged: LoggedSet = s;
      const cur = fromLogged(logged);
      const prev = draft?.last?.sets[s.set_number - 1];
      if (improvement(cur, prev ? fromLogged(prev) : null, unit)) improved++;
      if (isPR(cur, draft?.best)) {
        // Keep the strongest PR set per exercise for the summary line.
        const score = cur.duration ?? (cur.weight ? e1rm(cur.weight, cur.reps ?? 0) : (cur.reps ?? 0));
        if (!top || score > top.score) top = { score, set: logged };
      }
    }
    if (top && draft) prs.push({ exercise: draft.name, set: formatSet(top.set, unit) });
  }

  return {
    sessionId: payload.id,
    name: payload.name,
    unit,
    exercises: payload.exercises.filter((e) => e.status === "completed").length,
    sets,
    volume: Math.round(fromKg(volumeKg, unit)),
    improved,
    prs,
  };
}

// ---------------------------------------------------------------------------
// Exercise progress chart
// ---------------------------------------------------------------------------

/** What the chart plots: estimated 1RM (kg), bodyweight reps, or duration (seconds). */
export type ProgressMetric = "e1rm" | "reps" | "duration";

export type ProgressPoint = { date: string; value: number; set: LoggedSet };

/** Each session's best set for the chart, oldest first, plus the all-time best point. */
export function progressSeries(entries: HistoryEntry[]): {
  metric: ProgressMetric;
  points: ProgressPoint[];
  best: ProgressPoint | null;
} {
  const all = entries.flatMap((e) => e.sets);
  const metric: ProgressMetric = all.some((s) => s.duration_seconds)
    ? "duration"
    : all.some((s) => s.weight && s.reps)
      ? "e1rm"
      : "reps";
  const score = (s: LoggedSet): number | null => {
    if (metric === "duration") return s.duration_seconds ?? null;
    if (!s.reps) return null;
    if (metric === "reps") return s.weight ? null : s.reps;
    return s.weight ? e1rm(s.weight, s.reps) : null;
  };

  const points: ProgressPoint[] = [];
  for (const entry of [...entries].reverse()) {
    let top: ProgressPoint | null = null;
    for (const set of entry.sets) {
      const value = score(set);
      if (value !== null && (!top || value > top.value)) top = { date: entry.completed_at, value, set };
    }
    if (top) points.push(top);
  }
  const best = points.reduce<ProgressPoint | null>((b, p) => (!b || p.value > b.value ? p : b), null);
  return { metric, points, best };
}
