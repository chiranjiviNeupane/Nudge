// Row types mirror supabase/schema.sql.

/** strength: weight × reps. timed: duration (optionally with incline). */
export type ExerciseKind = "strength" | "timed";

export type Exercise = {
  id: string;
  user_id: string;
  name: string;
  kind: ExerciseKind;
  track_incline: boolean;
  created_at: string;
  updated_at: string;
};

export type WorkoutTemplate = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export type TemplateExercise = {
  id: string;
  user_id: string;
  template_id: string;
  exercise_id: string;
  position: number;
  default_sets: number;
  created_at: string;
};

export type SessionStatus = "in_progress" | "completed" | "abandoned";
export type SessionExerciseStatus = "pending" | "completed" | "skipped";

export type WorkoutSession = {
  id: string;
  user_id: string;
  template_id: string | null;
  name: string;
  started_at: string;
  completed_at: string | null;
  status: SessionStatus;
};

export type SetRow = {
  id: string;
  user_id: string;
  session_exercise_id: string;
  set_number: number;
  weight: number | null;
  reps: number | null;
  duration_seconds: number | null;
  incline: number | null;
  notes: string | null;
  completed: boolean;
  created_at: string;
};

// ---------------------------------------------------------------------------
// Derived / cached shapes
// ---------------------------------------------------------------------------

export type LoggedSet = {
  set_number: number;
  weight: number | null;
  reps: number | null;
  /** Timed sets. Optional because caches from before timed exercises lack them. */
  duration_seconds?: number | null;
  incline?: number | null;
};

/** Most recent completed session for one exercise (result of get_last_sessions). */
export type LastSession = {
  exercise_id: string;
  session_id: string;
  completed_at: string;
  sets: LoggedSet[];
};

/** Lightweight summary used for "Recent" on the home screen. */
export type SessionSummary = {
  id: string;
  template_id: string | null;
  name: string;
  completed_at: string;
  exercise_count: number;
};

/** One day in an exercise's history. */
export type HistoryEntry = {
  session_id: string;
  session_name: string;
  completed_at: string;
  sets: LoggedSet[];
};

/** One finished workout, as shown on its summary page. */
export type SessionDetail = {
  id: string;
  name: string;
  completed_at: string;
  exercises: {
    id: string;
    exercise_id: string;
    name: string;
    skipped: boolean;
    sets: LoggedSet[];
  }[];
  fetched_at: string;
};

export type ExerciseHistory = {
  exercise_id: string;
  entries: HistoryEntry[];
  fetched_at: string;
};

// ---------------------------------------------------------------------------
// Active workout draft (lives only in IndexedDB until the user finishes)
// ---------------------------------------------------------------------------

/** Weight/reps are kept as strings while editing so partial input like "27." survives. */
export type DraftSet = {
  id: string;
  weight: string;
  reps: string;
  /** Timed sets: "30", "30:15" or "1:05:00". Optional for drafts made before timed exercises. */
  duration?: string;
  incline?: string;
  completed: boolean;
  /** True once the user changed a value (or added the set). Untouched pre-filled sets may not have been done. */
  touched?: boolean;
};

export type DraftExercise = {
  /** Becomes session_exercises.id on save. */
  id: string;
  exerciseId: string;
  name: string;
  /** Snapshot of the exercise settings when added. Optional for older drafts (= strength). */
  kind?: ExerciseKind;
  trackIncline?: boolean;
  skipped: boolean;
  sets: DraftSet[];
  last: LastSession | null;
};

export type ActiveSession = {
  /** Singleton key — only one active workout at a time. */
  key: "current";
  /** Becomes workout_sessions.id on save. */
  sessionId: string;
  templateId: string | null;
  name: string;
  startedAt: string;
  /** Last time the user changed anything. Optional for drafts saved before this existed. */
  updatedAt?: string;
  exercises: DraftExercise[];
};

export type Meta = {
  key: string;
  value: string;
};
