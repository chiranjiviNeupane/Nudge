// Fixed muscle-group tags. Keep in sync with exercises_muscle_groups_check in supabase/schema.sql.

export const MUSCLE_GROUPS = [
  { value: "chest", label: "Chest" },
  { value: "back", label: "Back" },
  { value: "shoulders", label: "Shoulders" },
  { value: "arms", label: "Arms" },
  { value: "legs", label: "Legs" },
  { value: "core", label: "Core" },
  { value: "cardio", label: "Cardio" },
  { value: "full_body", label: "Full body" },
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number]["value"];

/** "Chest · Arms", in the fixed list order. */
export function formatMuscleGroups(groups: readonly string[] | undefined): string {
  return MUSCLE_GROUPS.filter((g) => groups?.includes(g.value))
    .map((g) => g.label)
    .join(" · ");
}
