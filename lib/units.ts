// Weights are always stored in kg; the unit (a preference, see lib/preferences.ts)
// only changes what's shown and typed.

export type WeightUnit = "kg" | "lb";

const LB_PER_KG = 2.20462262;

/** Stored kg → shown value (lb rounded to 0.1, which round-trips through 0.01 kg storage). */
export function fromKg(kg: number, unit: WeightUnit): number {
  return unit === "kg" ? kg : Math.round(kg * LB_PER_KG * 10) / 10;
}

/** Typed value → kg for storage (2 decimals, like the database column). */
export function toKg(value: number, unit: WeightUnit): number {
  return unit === "kg" ? value : Math.round((value / LB_PER_KG) * 100) / 100;
}
