"use client";

import { ChipFilter, chipClass } from "@/components/common/ChipFilter";
import { MUSCLE_GROUPS, type MuscleGroup } from "@/lib/muscleGroups";
import type { Exercise } from "@/lib/db/types";

/** Exercises matching a filter chip (null = All). */
export function matchesGroup(exercise: Pick<Exercise, "muscle_groups">, group: MuscleGroup | null) {
  return !group || (exercise.muscle_groups ?? []).includes(group);
}

/**
 * Filter row with each group that at least one exercise uses. Renders nothing
 * until something is tagged.
 */
export function MuscleGroupFilter({
  exercises,
  value,
  onChange,
  className,
}: {
  exercises: Pick<Exercise, "muscle_groups">[];
  value: MuscleGroup | null;
  onChange: (group: MuscleGroup | null) => void;
  className?: string;
}) {
  const used = new Set(exercises.flatMap((e) => e.muscle_groups ?? []));
  const groups = MUSCLE_GROUPS.filter((g) => used.has(g.value) || g.value === value);
  if (groups.length === 0) return null;
  return (
    <ChipFilter
      label="Filter by muscle group"
      options={groups}
      value={value}
      onChange={onChange}
      className={className}
    />
  );
}

/** Multi-select used when creating or editing an exercise. */
export function MuscleGroupPicker({
  value,
  onChange,
  labelledBy,
}: {
  value: MuscleGroup[];
  onChange: (groups: MuscleGroup[]) => void;
  labelledBy: string;
}) {
  const toggle = (g: MuscleGroup) =>
    onChange(value.includes(g) ? value.filter((x) => x !== g) : [...value, g]);
  return (
    <div role="group" aria-labelledby={labelledBy} className="flex flex-wrap gap-2">
      {MUSCLE_GROUPS.map((g) => (
        <button
          key={g.value}
          type="button"
          aria-pressed={value.includes(g.value)}
          onClick={() => toggle(g.value)}
          className={chipClass(value.includes(g.value))}
        >
          {g.label}
        </button>
      ))}
    </div>
  );
}
