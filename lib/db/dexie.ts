import Dexie, { type EntityTable } from "dexie";
import type {
  ActiveSession,
  Exercise,
  ExerciseHistory,
  LastSession,
  Meta,
  SessionDetail,
  SessionSummary,
  TemplateExercise,
  WorkoutTemplate,
} from "./types";

/**
 * Local cache of the signed-in user's data. Supabase is the source of truth;
 * the UI reads from here (via useLiveQuery) so screens render instantly and
 * keep working when the network is flaky.
 */
class RecordDB extends Dexie {
  exercises!: EntityTable<Exercise, "id">;
  templates!: EntityTable<WorkoutTemplate, "id">;
  templateExercises!: EntityTable<TemplateExercise, "id">;
  lastSessions!: EntityTable<LastSession, "exercise_id">;
  recentSessions!: EntityTable<SessionSummary, "id">;
  history!: EntityTable<ExerciseHistory, "exercise_id">;
  sessionDetails!: EntityTable<SessionDetail, "id">;
  activeSession!: EntityTable<ActiveSession, "key">;
  meta!: EntityTable<Meta, "key">;

  constructor() {
    super("record");
    this.version(1).stores({
      exercises: "id, name",
      templates: "id, created_at",
      templateExercises: "id, template_id, exercise_id",
      lastSessions: "exercise_id",
      recentSessions: "id, completed_at",
      history: "exercise_id",
      activeSession: "key",
      outbox: "++id, created_at",
      meta: "key",
    });
    // v2: cached workout summaries (opened from "Recent" on Home).
    this.version(2).stores({
      sessionDetails: "id",
    });
    // v3: drop the unused offline-outbox placeholder table.
    this.version(3).stores({
      outbox: null,
    });
  }
}

export const db = new RecordDB();

/** Wipe everything local — used on sign-out or when a different user signs in. */
export async function clearLocalData() {
  await db.transaction("rw", db.tables, async () => {
    await Promise.all(db.tables.map((t) => t.clear()));
  });
}
