import type { LoggedSet } from "@/lib/db/types";
import { fromKg, type WeightUnit } from "@/lib/units";

/** Stored kg → "80" / "176.4" in the chosen unit; null is bodyweight. */
export function formatWeight(weight: number | null, unit: WeightUnit = "kg"): string {
  if (weight === null) return "BW";
  return String(fromKg(Number(weight), unit));
}

/** 1800 → "30:00", 3905 → "1:05:05". */
export function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const ss = String(totalSeconds % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

/**
 * "80 × 10" / "BW × 10" for strength (weight in `unit`); "30:00 @ 8%" / "1:00" for timed.
 * Decided by the set's own data, so history stays readable if an exercise's type changes.
 */
export function formatSet(set: LoggedSet, unit: WeightUnit = "kg"): string {
  if (set.duration_seconds) {
    const t = formatDuration(set.duration_seconds);
    return set.incline != null ? `${t} @ ${Number(set.incline)}%` : t;
  }
  return `${formatWeight(set.weight, unit)} × ${set.reps}`;
}

/** "Sep 24", with the year appended when it isn't the current year. */
export function formatShortDate(iso: string): string {
  const d = new Date(iso);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

/** "Thursday, Sep 24" (year added when not the current year). */
export function formatLongDate(iso: string): string {
  const d = new Date(iso);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

/** "Today", "Yesterday", or a short date. */
export function formatRelativeDay(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOf(today) - startOf(d)) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return formatShortDate(iso);
}

export function greeting(date = new Date()): string {
  const h = date.getHours();
  if (h < 5) return "Good evening";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export function pluralize(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}
