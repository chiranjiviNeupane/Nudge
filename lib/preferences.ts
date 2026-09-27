import { useSyncExternalStore } from "react";
import type { WeightUnit } from "./units";

// Per-account settings. The source of truth is the account (Supabase auth
// user_metadata, see lib/auth/auth.ts); this is a synchronous mirror in
// localStorage so screens can read them while rendering.

export type Preferences = {
  weightUnit: WeightUnit;
  /** Workouts per week to aim for; null = no goal. */
  weeklyGoal: number | null;
};

const KEY = "preferences";
const DEFAULTS: Preferences = { weightUnit: "kg", weeklyGoal: null };
const listeners = new Set<() => void>();
let cached: Preferences | null = null;

/** user_metadata ↔ Preferences. Unknown or invalid values fall back to defaults. */
export function preferencesFromMetadata(meta: Record<string, unknown> | undefined): Preferences {
  const goal = meta?.weekly_goal;
  return {
    weightUnit: meta?.weight_unit === "lb" ? "lb" : "kg",
    weeklyGoal: typeof goal === "number" && goal >= 1 && goal <= 7 ? goal : null,
  };
}

export function toMetadata(p: Partial<Preferences>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (p.weightUnit !== undefined) out.weight_unit = p.weightUnit;
  if (p.weeklyGoal !== undefined) out.weekly_goal = p.weeklyGoal;
  return out;
}

export function getPreferences(): Preferences {
  if (cached) return cached;
  try {
    cached = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    cached = DEFAULTS;
  }
  return cached!;
}

/** Updates this device only; savePreferences in lib/auth/auth.ts also updates the account. */
export function setLocalPreferences(patch: Partial<Preferences>) {
  cached = { ...getPreferences(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(cached));
  } catch {}
  listeners.forEach((l) => l());
}

export function usePreference<K extends keyof Preferences>(key: K): Preferences[K] {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    () => getPreferences()[key],
    () => DEFAULTS[key],
  );
}

export const useWeightUnit = () => usePreference("weightUnit");
export const getWeightUnit = () => getPreferences().weightUnit;
