import { getSupabase } from "@/lib/supabase/client";
import { db } from "@/lib/db/dexie";
import { newId } from "@/lib/id";
import type { Exercise, ExerciseHistory, ExerciseKind, HistoryEntry, LoggedSet } from "@/lib/db/types";
import { check, RepositoryError } from "./errors";
import { normalizeSets, SET_COLUMNS } from "./sets";
import type { MuscleGroup } from "@/lib/muscleGroups";

/** Editable exercise settings. */
export type ExerciseInput = {
  name: string;
  kind: ExerciseKind;
  /** Only meaningful for timed exercises. */
  trackIncline: boolean;
  muscleGroups: MuscleGroup[];
};

const toRow = (input: ExerciseInput) => ({
  name: cleanName(input.name),
  kind: input.kind,
  track_incline: input.kind === "timed" && input.trackIncline,
  muscle_groups: input.muscleGroups,
});

const cleanName = (name: string) => name.trim().replace(/\s+/g, " ");

export async function fetchExercises(): Promise<Exercise[]> {
  const { data, error } = await getSupabase().from("exercises").select("*").order("name");
  check(error, "Couldn’t load exercises");
  return data ?? [];
}

export async function createExercise(input: ExerciseInput): Promise<Exercise> {
  const row = toRow(input);
  if (!row.name) throw new RepositoryError("Give the exercise a name.");
  const { data, error } = await getSupabase()
    .from("exercises")
    .insert({ id: newId(), ...row })
    .select()
    .single();
  check(error, "Couldn’t create exercise");
  await db.exercises.put(data);
  return data;
}

/** Find a strength exercise by name (case-insensitive) or create it with these muscle groups. */
export async function findOrCreateExercise(name: string, muscleGroups: MuscleGroup[] = []): Promise<Exercise> {
  const value = cleanName(name);
  const existing = await db.exercises
    .filter((e) => e.name.toLowerCase() === value.toLowerCase())
    .first();
  return existing ?? createExercise({ name: value, kind: "strength", trackIncline: false, muscleGroups });
}

/** Update name, type and incline tracking. Past sets are untouched. */
export async function updateExercise(id: string, input: ExerciseInput): Promise<void> {
  const row = toRow(input);
  if (!row.name) throw new RepositoryError("Give the exercise a name.");
  const { data, error } = await getSupabase()
    .from("exercises")
    .update(row)
    .eq("id", id)
    .select()
    .single();
  check(error, "Couldn’t update exercise");
  await db.exercises.put(data);
}

export async function deleteExercise(id: string): Promise<void> {
  const { error } = await getSupabase().from("exercises").delete().eq("id", id);
  if (error?.code === "23503") {
    throw new RepositoryError(
      "This exercise is used in a routine or in your history, so it can’t be deleted.",
      error.code,
    );
  }
  check(error, "Couldn’t delete exercise");
  await db.transaction("rw", [db.exercises, db.lastSessions, db.history], async () => {
    await db.exercises.delete(id);
    await db.lastSessions.delete(id);
    await db.history.delete(id);
  });
}

type HistoryRow = {
  id: string;
  sets: LoggedSet[];
  workout_sessions: { id: string; name: string; completed_at: string; status: string };
};

/** Full history for one exercise, newest first. Cached so it opens offline. */
export async function refreshExerciseHistory(exerciseId: string): Promise<ExerciseHistory> {
  const { data, error } = await getSupabase()
    .from("session_exercises")
    .select(
      `id, sets(${SET_COLUMNS}), workout_sessions!inner(id, name, completed_at, status)`,
    )
    .eq("exercise_id", exerciseId)
    .neq("status", "skipped")
    .eq("workout_sessions.status", "completed");
  check(error, "Couldn’t load history");

  const entries: HistoryEntry[] = ((data ?? []) as HistoryRow[])
    .filter((row) => row.sets.length > 0)
    .map((row) => ({
      session_id: row.workout_sessions.id,
      session_name: row.workout_sessions.name,
      completed_at: row.workout_sessions.completed_at,
      sets: normalizeSets(row.sets),
    }))
    .sort((a, b) => b.completed_at.localeCompare(a.completed_at));

  const history: ExerciseHistory = {
    exercise_id: exerciseId,
    entries,
    fetched_at: new Date().toISOString(),
  };
  await db.history.put(history);
  return history;
}
