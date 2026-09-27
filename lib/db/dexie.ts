import Dexie, { type EntityTable } from "dexie";
import type {
  ActiveSession,
  Exercise,
  ExerciseBest,
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
class NudgeDB extends Dexie {
  exercises!: EntityTable<Exercise, "id">;
  templates!: EntityTable<WorkoutTemplate, "id">;
  templateExercises!: EntityTable<TemplateExercise, "id">;
  lastSessions!: EntityTable<LastSession, "exercise_id">;
  bests!: EntityTable<ExerciseBest, "exercise_id">;
  recentSessions!: EntityTable<SessionSummary, "id">;
  history!: EntityTable<ExerciseHistory, "exercise_id">;
  sessionDetails!: EntityTable<SessionDetail, "id">;
  activeSession!: EntityTable<ActiveSession, "key">;
  meta!: EntityTable<Meta, "key">;

  constructor() {
    super("nudge");
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
    // v4: all-time bests per exercise (PR badges), prefetched like lastSessions.
    this.version(4).stores({
      bests: "exercise_id",
    });
  }
}

export const db = new NudgeDB();

/**
 * One-time move from the database the app used under its original name.
 * Copies everything (above all an in-progress workout, which exists only on
 * the device) into this one, then deletes the old database. Runs before
 * anything else reads the cache (SessionProvider); a no-op once done. Safe to
 * delete this function once every device has opened the app since the rename.
 */
let legacyMigration: Promise<void> | null = null;

export function migrateLegacyDatabase(): Promise<void> {
  // Shared, so overlapping callers (e.g. React re-running an effect) never run two moves at once.
  return (legacyMigration ??= moveLegacyDatabase());
}

async function moveLegacyDatabase(): Promise<void> {
  const LEGACY_NAME = "record";
  try {
    if (!(await Dexie.exists(LEGACY_NAME))) return;
    // No schema declared: Dexie opens the old database with whatever tables it has.
    const legacy = new Dexie(LEGACY_NAME);
    await legacy.open();
    const copies = await Promise.all(
      legacy.tables
        .filter((t) => db.tables.some((own) => own.name === t.name))
        .map(async (t) => ({ name: t.name, rows: await t.toArray() })),
    );
    legacy.close();
    await db.transaction("rw", db.tables, async () => {
      for (const { name, rows } of copies) await db.table(name).bulkPut(rows);
    });
    await Dexie.delete(LEGACY_NAME);
  } catch (e) {
    // Worst case the cache refills from the server on the next sync.
    console.error("[Nudge] moving local data from the old database failed", e);
  }
}

/** Wipe everything local — used on sign-out or when a different user signs in. */
export async function clearLocalData() {
  await db.transaction("rw", db.tables, async () => {
    await Promise.all(db.tables.map((t) => t.clear()));
  });
}
