// Weekly goal and streak. Weeks run Monday to Sunday in local time.

/** Local Monday 00:00 of the week containing `d`. */
export function weekStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));
}

/**
 * How this week is going, and how many weeks in a row met the goal.
 * The current week only adds to the streak once it's met; until then the
 * streak shown is the one it can still extend.
 */
export function weeklyProgress(
  completedAt: string[],
  goal: number | null,
  now = new Date(),
): { thisWeek: number; streak: number } {
  const counts = new Map<number, number>();
  for (const iso of completedAt) {
    const key = weekStart(new Date(iso)).getTime();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const current = weekStart(now);
  const thisWeek = counts.get(current.getTime()) ?? 0;
  if (!goal) return { thisWeek, streak: 0 };

  let streak = thisWeek >= goal ? 1 : 0;
  // Walk back one week at a time (by calendar date, so DST shifts don't matter).
  for (let i = 1; ; i++) {
    const week = new Date(current.getFullYear(), current.getMonth(), current.getDate() - 7 * i).getTime();
    if ((counts.get(week) ?? 0) < goal) break;
    streak++;
  }
  return { thisWeek, streak };
}
