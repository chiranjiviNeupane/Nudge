import { db } from "@/lib/db/dexie";
import { findOrCreateExercise } from "./exercises";
import { saveTemplate } from "./templates";

export const EXAMPLE_ROUTINES: { name: string; exercises: string[] }[] = [
  {
    name: "Push Day",
    exercises: ["Bench Press", "Incline Dumbbell Press", "Shoulder Press", "Lateral Raise", "Tricep Pushdown"],
  },
  {
    name: "Pull Day",
    exercises: ["Pull Up", "Barbell Row", "Lat Pulldown", "Face Pull", "Bicep Curl"],
  },
  {
    name: "Leg Day",
    exercises: ["Squat", "Leg Press", "Romanian Deadlift", "Leg Extension", "Leg Curl"],
  },
];

/** Adds the example routines (skipping any whose name already exists). Returns how many were added. */
export async function addExampleRoutines(): Promise<number> {
  const existing = new Set((await db.templates.toArray()).map((t) => t.name.toLowerCase()));
  let added = 0;
  for (const routine of EXAMPLE_ROUTINES) {
    if (existing.has(routine.name.toLowerCase())) continue;
    const exercises = [];
    for (const name of routine.exercises) exercises.push(await findOrCreateExercise(name));
    await saveTemplate(
      null,
      routine.name,
      exercises.map((e) => ({ exerciseId: e.id, defaultSets: 3 })),
    );
    added++;
  }
  return added;
}
