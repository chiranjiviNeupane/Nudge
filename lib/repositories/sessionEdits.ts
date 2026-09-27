import { getSupabase } from "@/lib/supabase/client";
import { db } from "@/lib/db/dexie";
import { refreshRecentSessions } from "@/lib/sync/refresh";
import { check } from "./errors";
import { fetchBests, fetchLastSessions, refreshSessionDetail, type SaveSessionPayload } from "./sessions";

// Changing a finished workout. Both paths refresh every cache the workout
// feeds: "last session" pre-fills, personal bests, Recent on Home, per-exercise history, and
// the workout's own summary.

async function refreshAfterChange(exerciseIds: string[]) {
  const ids = [...new Set(exerciseIds)];
  await Promise.allSettled([
    fetchLastSessions(ids),
    fetchBests(ids),
    refreshRecentSessions(),
    db.history.bulkDelete(ids),
  ]);
}

/** Rename the workout and replace its exercises and sets (times are kept). */
export async function updateSession(payload: SaveSessionPayload, previousExerciseIds: string[]): Promise<void> {
  const { error } = await getSupabase().rpc("update_session", { p: payload });
  check(error, "Couldn’t save changes");
  await Promise.allSettled([
    refreshSessionDetail(payload.id),
    refreshAfterChange([...previousExerciseIds, ...payload.exercises.map((e) => e.exercise_id)]),
  ]);
}

/** Delete a finished workout with its exercises and sets. */
export async function deleteSession(sessionId: string, exerciseIds: string[]): Promise<void> {
  const { error } = await getSupabase().from("workout_sessions").delete().eq("id", sessionId);
  check(error, "Couldn’t delete workout");
  await db.sessionDetails.delete(sessionId);
  await refreshAfterChange(exerciseIds);
}
