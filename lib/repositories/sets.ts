import type { LoggedSet } from "@/lib/db/types";

/** Columns selected wherever logged sets are read. */
export const SET_COLUMNS = "set_number, weight, reps, duration_seconds, incline";

type RawSet = {
  set_number: number;
  weight: number | string | null;
  reps: number | null;
  duration_seconds?: number | null;
  incline?: number | string | null;
};

const num = (v: number | string | null | undefined) => (v == null ? null : Number(v));

/** Postgres numerics arrive as strings; normalize to numbers. */
export function normalizeSet(s: RawSet): LoggedSet {
  return {
    set_number: s.set_number,
    weight: num(s.weight),
    reps: s.reps ?? null,
    duration_seconds: s.duration_seconds ?? null,
    incline: num(s.incline),
  };
}

export function normalizeSets(sets: RawSet[] | null | undefined): LoggedSet[] {
  return [...(sets ?? [])].sort((a, b) => a.set_number - b.set_number).map(normalizeSet);
}
