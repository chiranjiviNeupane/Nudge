import type { ActiveSession } from "@/lib/db/types";

// Detects a workout the user probably forgot to finish.

const HOUR = 3_600_000;
/** Untouched this long → assume the workout is over. */
export const STALE_AFTER_MS = 3 * HOUR;
/** A draft from an earlier calendar day only needs to be idle this long. */
export const STALE_AFTER_MS_PREVIOUS_DAY = 1 * HOUR;

/** Mark the draft as edited just now. */
export function touch(s: ActiveSession, now = new Date()): ActiveSession {
  return { ...s, updatedAt: now.toISOString() };
}

/** When the user last did anything in this workout. */
export function lastActivity(s: ActiveSession): Date {
  return new Date(s.updatedAt ?? s.startedAt);
}

const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

export function isStale(s: ActiveSession, now = new Date()): boolean {
  const last = lastActivity(s);
  const idle = now.getTime() - last.getTime();
  if (idle >= STALE_AFTER_MS) return true;
  // Started yesterday (e.g. forgot last night) but touched recently-ish:
  // a shorter idle window avoids nagging someone training past midnight.
  const earlierDay = dayStart(new Date(s.startedAt)) < dayStart(now);
  return earlierDay && idle >= STALE_AFTER_MS_PREVIOUS_DAY;
}
