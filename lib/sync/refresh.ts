import { db, clearLocalData } from "@/lib/db/dexie";
import { fetchExercises } from "@/lib/repositories/exercises";
import { fetchTemplates } from "@/lib/repositories/templates";
import { fetchLastSessions, fetchRecentSessions } from "@/lib/repositories/sessions";

// Pulls the user's data from Supabase into IndexedDB. Called on app load,
// when the tab regains focus, and when the device comes back online.
// Writes are online-only for now (saves use client-generated ids and are
// idempotent, so an offline queue can be added later without server changes).

const USER_KEY = "userId";
const SYNCED_KEY = "lastSyncedAt";

/** Make sure the local cache belongs to this user; wipe it if not. */
export async function ensureLocalUser(userId: string): Promise<void> {
  const current = await db.meta.get(USER_KEY);
  if (current?.value === userId) return;
  await clearLocalData();
  await db.meta.put({ key: USER_KEY, value: userId });
}

export async function hasSynced(): Promise<boolean> {
  return !!(await db.meta.get(SYNCED_KEY));
}

export async function refreshRecentSessions(): Promise<void> {
  const recent = await fetchRecentSessions();
  await db.transaction("rw", db.recentSessions, async () => {
    await db.recentSessions.clear();
    await db.recentSessions.bulkPut(recent);
  });
}

export async function refreshAll(): Promise<void> {
  const [exercises, { templates, templateExercises }] = await Promise.all([
    fetchExercises(),
    fetchTemplates(),
  ]);

  await db.transaction("rw", [db.exercises, db.templates, db.templateExercises], async () => {
    await Promise.all([db.exercises.clear(), db.templates.clear(), db.templateExercises.clear()]);
    await Promise.all([
      db.exercises.bulkPut(exercises),
      db.templates.bulkPut(templates),
      db.templateExercises.bulkPut(templateExercises),
    ]);
  });

  // Prefetch "last session" for every exercise so starting a workout is instant
  // (and works from cache if the gym has no signal).
  await Promise.all([
    fetchLastSessions(exercises.map((e) => e.id)),
    refreshRecentSessions(),
  ]);

  await db.meta.put({ key: SYNCED_KEY, value: new Date().toISOString() });
}
