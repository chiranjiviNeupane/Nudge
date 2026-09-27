"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db/dexie";
import { ACTIVITY_KEY } from "@/lib/sync/refresh";
import type { Exercise, WorkoutTemplate } from "@/lib/db/types";

// Read-side hooks. Components read the local cache reactively; repositories
// keep it in sync with Supabase. `undefined` means "still loading".

export function useExercises() {
  return useLiveQuery(() => db.exercises.orderBy("name").toArray(), []);
}

export function useExercise(id: string) {
  return useLiveQuery(async () => (await db.exercises.get(id)) ?? null, [id]);
}

export type TemplateWithExercises = WorkoutTemplate & {
  items: { id: string; exercise: Exercise; defaultSets: number }[];
};

async function loadTemplate(template: WorkoutTemplate): Promise<TemplateWithExercises> {
  const rows = await db.templateExercises.where("template_id").equals(template.id).sortBy("position");
  const exercises = await db.exercises.bulkGet(rows.map((r) => r.exercise_id));
  return {
    ...template,
    items: rows.flatMap((r, i) => {
      const exercise = exercises[i];
      return exercise ? [{ id: r.id, exercise, defaultSets: r.default_sets }] : [];
    }),
  };
}

export function useTemplates() {
  return useLiveQuery(async () => {
    const templates = await db.templates.orderBy("created_at").toArray();
    return Promise.all(templates.map(loadTemplate));
  }, []);
}

export function useTemplate(id: string | null) {
  return useLiveQuery(async () => {
    if (!id) return null;
    const t = await db.templates.get(id);
    return t ? loadTemplate(t) : null;
  }, [id]);
}

export function useRecentSessions(limit = 5) {
  return useLiveQuery(
    () => db.recentSessions.orderBy("completed_at").reverse().limit(limit).toArray(),
    [limit],
  );
}

export function useActiveSession() {
  return useLiveQuery(async () => (await db.activeSession.get("current")) ?? null, []);
}

export function useExerciseHistory(exerciseId: string) {
  return useLiveQuery(async () => (await db.history.get(exerciseId)) ?? null, [exerciseId]);
}

export function useSessionDetail(sessionId: string) {
  return useLiveQuery(async () => (await db.sessionDetails.get(sessionId)) ?? null, [sessionId]);
}

/**
 * Completion times of the last year's workouts (weekly goal, streak).
 * `undefined` while loading, `null` if not synced yet since this was added.
 */
export function useActivity() {
  return useLiveQuery(async () => {
    const row = await db.meta.get(ACTIVITY_KEY);
    return row ? (JSON.parse(row.value) as string[]) : null;
  }, []);
}
