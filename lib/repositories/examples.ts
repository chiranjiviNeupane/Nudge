import { db } from "@/lib/db/dexie";
import type { MuscleGroup } from "@/lib/muscleGroups";
import { findOrCreateExercise } from "./exercises";
import { saveTemplate } from "./templates";

type Example = [name: string, groups: MuscleGroup[]];

export const EXAMPLE_ROUTINES: { name: string; exercises: Example[] }[] = [
  {
    name: "Push Day",
    exercises: [
      ["Bench Press", ["chest", "arms"]],
      ["Incline Dumbbell Press", ["chest", "shoulders"]],
      ["Shoulder Press", ["shoulders", "arms"]],
      ["Lateral Raise", ["shoulders"]],
      ["Tricep Pushdown", ["arms"]],
    ],
  },
  {
    name: "Pull Day",
    exercises: [
      ["Pull Up", ["back", "arms"]],
      ["Barbell Row", ["back"]],
      ["Lat Pulldown", ["back"]],
      ["Face Pull", ["shoulders", "back"]],
      ["Bicep Curl", ["arms"]],
    ],
  },
  {
    name: "Leg Day",
    exercises: [
      ["Squat", ["legs", "core"]],
      ["Leg Press", ["legs"]],
      ["Romanian Deadlift", ["legs", "back"]],
      ["Leg Extension", ["legs"]],
      ["Leg Curl", ["legs"]],
    ],
  },
];

/** Adds the example routines (skipping any whose name already exists). Returns how many were added. */
export async function addExampleRoutines(): Promise<number> {
  const existing = new Set((await db.templates.toArray()).map((t) => t.name.toLowerCase()));
  let added = 0;
  for (const routine of EXAMPLE_ROUTINES) {
    if (existing.has(routine.name.toLowerCase())) continue;
    const exercises = [];
    for (const [name, groups] of routine.exercises) exercises.push(await findOrCreateExercise(name, groups));
    await saveTemplate(
      null,
      routine.name,
      exercises.map((e) => ({ exerciseId: e.id, defaultSets: 3 })),
    );
    added++;
  }
  return added;
}
