import { getSupabase } from "@/lib/supabase/client";
import { db } from "@/lib/db/dexie";
import type { LastSession, LoggedSet, SessionDetail, SessionSummary } from "@/lib/db/types";
import { check } from "./errors";
import { normalizeSets, SET_COLUMNS } from "./sets";

export type SaveSessionPayload = {
  id: string;
  template_id: string | null;
  name: string;
  started_at: string;
  completed_at: string;
  exercises: {
    id: string;
    exercise_id: string;
    position: number;
    status: "completed" | "skipped";
    sets: {
      set_number: number;
      weight: number | null;
      reps: number | null;
      duration_seconds: number | null;
      incline: number | null;
      completed: boolean;
    }[];
  }[];
};

type LastSessionRow = {
  exercise_id: string;
  session_id: string;
  completed_at: string;
  sets: LoggedSet[] | null;
};

/** Most recent completed session per exercise, from the server. Updates the cache. */
export async function fetchLastSessions(exerciseIds: string[]): Promise<LastSession[]> {
  if (exerciseIds.length === 0) return [];
  const { data, error } = await getSupabase().rpc("get_last_sessions", {
    p_exercise_ids: exerciseIds,
  });
  check(error, "Could not load previous sessions");

  const rows: LastSession[] = ((data ?? []) as LastSessionRow[]).map((r) => ({
    exercise_id: r.exercise_id,
    session_id: r.session_id,
    completed_at: r.completed_at,
    sets: normalizeSets(r.sets),
  }));

  await db.transaction("rw", db.lastSessions, async () => {
    // Exercises with no qualifying session anymore must not keep a stale entry.
    const found = new Set(rows.map((r) => r.exercise_id));
    await db.lastSessions.bulkDelete(exerciseIds.filter((id) => !found.has(id)));
    await db.lastSessions.bulkPut(rows);
  });
  return rows;
}

/**
 * Previous sessions for the given exercises: network first (bounded by a
 * timeout so a weak gym signal never blocks starting a workout), cache second.
 */
export async function getLastSessions(
  exerciseIds: string[],
  timeoutMs = 2500,
): Promise<Map<string, LastSession>> {
  try {
    await Promise.race([
      fetchLastSessions(exerciseIds),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), timeoutMs)),
    ]);
  } catch {
    // Fall through to whatever is cached.
  }
  const cached = await db.lastSessions.bulkGet(exerciseIds);
  return new Map(cached.filter((x): x is LastSession => !!x).map((x) => [x.exercise_id, x]));
}

type RecentRow = {
  id: string;
  template_id: string | null;
  name: string;
  completed_at: string;
  session_exercises: { status: string }[];
};

export async function fetchRecentSessions(limit = 10): Promise<SessionSummary[]> {
  const { data, error } = await getSupabase()
    .from("workout_sessions")
    .select("id, template_id, name, completed_at, session_exercises(status)")
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(limit);
  check(error, "Could not load recent workouts");
  return ((data ?? []) as RecentRow[]).map((r) => ({
    id: r.id,
    template_id: r.template_id,
    name: r.name,
    completed_at: r.completed_at,
    exercise_count: r.session_exercises.filter((e) => e.status !== "skipped").length,
  }));
}

export async function saveSession(payload: SaveSessionPayload): Promise<void> {
  const { error } = await getSupabase().rpc("save_session", { p: payload });
  check(error, "Could not save workout");
}

type SessionDetailRow = {
  id: string;
  name: string;
  completed_at: string;
  session_exercises: {
    id: string;
    exercise_id: string;
    position: number;
    status: string;
    exercises: { name: string } | null;
    sets: LoggedSet[];
  }[];
};

/** One finished workout with its exercises and sets. Cached so it opens offline. */
export async function refreshSessionDetail(sessionId: string): Promise<SessionDetail | null> {
  const { data, error } = await getSupabase()
    .from("workout_sessions")
    .select(
      `id, name, completed_at, session_exercises(id, exercise_id, position, status, exercises(name), sets(${SET_COLUMNS}))`,
    )
    .eq("id", sessionId)
    .eq("status", "completed")
    .maybeSingle();
  check(error, "Could not load workout");
  if (!data) {
    await db.sessionDetails.delete(sessionId);
    return null;
  }

  const row = data as SessionDetailRow;
  const detail: SessionDetail = {
    id: row.id,
    name: row.name,
    completed_at: row.completed_at,
    exercises: [...row.session_exercises]
      .sort((a, b) => a.position - b.position)
      .map((e) => ({
        id: e.id,
        exercise_id: e.exercise_id,
        name: e.exercises?.name ?? "Exercise",
        skipped: e.status === "skipped" || e.sets.length === 0,
        sets: normalizeSets(e.sets),
      })),
    fetched_at: new Date().toISOString(),
  };
  await db.sessionDetails.put(detail);
  return detail;
}
