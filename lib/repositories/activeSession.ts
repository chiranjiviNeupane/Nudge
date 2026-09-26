import { db } from "@/lib/db/dexie";
import type { ActiveSession } from "@/lib/db/types";
import { buildDraftExercise, buildSession, DEFAULT_SETS, type DraftSource } from "@/lib/workout/buildSession";
import { toSavePayload, type SaveMode } from "@/lib/workout/draftOps";
import { getLastSessions, saveSession, fetchLastSessions } from "./sessions";
import { refreshRecentSessions } from "@/lib/sync/refresh";

// The in-progress workout lives only in IndexedDB until it is finished, so
// edits between sets are instant and survive reloads / a locked phone.

export async function getActiveSession(): Promise<ActiveSession | undefined> {
  return db.activeSession.get("current");
}

export async function putActiveSession(session: ActiveSession): Promise<void> {
  await db.activeSession.put(session);
}

export async function discardActiveSession(): Promise<void> {
  await db.activeSession.delete("current");
}

/** Start today's workout from a template (null = empty custom workout). */
export async function startWorkout(templateId: string | null): Promise<ActiveSession> {
  const existing = await getActiveSession();
  if (existing) return existing;

  let source: Parameters<typeof buildSession>[0] = {
    templateId: null,
    name: "Workout",
    exercises: [],
  };

  if (templateId) {
    const template = await db.templates.get(templateId);
    if (!template) throw new Error("Workout not found.");
    const items = await db.templateExercises.where("template_id").equals(templateId).sortBy("position");
    const exercises = await db.exercises.bulkGet(items.map((i) => i.exercise_id));
    source = {
      templateId,
      name: template.name,
      exercises: items.flatMap((item, i) => {
        const ex = exercises[i];
        return ex
          ? [{ id: ex.id, name: ex.name, kind: ex.kind, track_incline: ex.track_incline, defaultSets: item.default_sets }]
          : [];
      }),
    };
  }

  const last = await getLastSessions(source.exercises.map((e) => e.id));
  const session = buildSession(source, last);
  await putActiveSession(session);
  return session;
}

/** Build a draft entry for an exercise added mid-workout (prefilled from its last session). */
export async function buildAddedExercise(exercise: DraftSource) {
  const last = await getLastSessions([exercise.id]);
  return buildDraftExercise(exercise, last.get(exercise.id) ?? null, DEFAULT_SETS);
}

/**
 * Persist the finished workout to Supabase, then clear the local draft.
 * `completedAt` lets a forgotten workout be saved with its real end time;
 * `mode` "ticked" drops sets that weren't ticked off.
 */
export async function finishWorkout(
  session: ActiveSession,
  completedAt = new Date(),
  mode: SaveMode = "all",
): Promise<void> {
  const payload = toSavePayload(session, completedAt, mode);
  await saveSession(payload);
  await discardActiveSession();
  // Refresh caches so the next workout shows today's numbers as "last session".
  const savedIds = payload.exercises.filter((e) => e.status === "completed").map((e) => e.exercise_id);
  await Promise.allSettled([
    fetchLastSessions(savedIds),
    refreshRecentSessions(),
    db.history.bulkDelete(savedIds),
  ]);
}
