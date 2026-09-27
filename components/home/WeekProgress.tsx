"use client";

import Link from "next/link";
import { useActivity } from "@/lib/hooks/data";
import { usePreference } from "@/lib/preferences";
import { weeklyProgress } from "@/lib/workout/weekly";
import { pluralize } from "@/lib/format";
import type { SessionSummary } from "@/lib/db/types";
import { cn } from "@/lib/utils";

/** The line under the greeting: this week vs the weekly goal, and the streak. */
export function WeekProgress({ recent }: { recent: SessionSummary[] }) {
  const activity = useActivity();
  const goal = usePreference("weeklyGoal");
  if (activity === undefined) return null;

  // Before the first sync with activity, Recent is a close-enough stand-in.
  const dates = activity ?? recent.map((s) => s.completed_at);
  const { thisWeek, streak } = weeklyProgress(dates, goal);

  if (!goal) {
    if (dates.length === 0) return null;
    return (
      <p className="mt-1 text-sm text-muted-foreground">
        {thisWeek === 0 ? "No workouts yet this week" : `${pluralize(thisWeek, "workout")} this week`}
        {" · "}
        <Link href="/settings" className="font-medium text-foreground underline-offset-2 hover:underline">
          Set a weekly goal
        </Link>
      </p>
    );
  }

  const met = thisWeek >= goal;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
      <div
        className="flex gap-1"
        role="meter"
        aria-label="Workouts this week"
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-valuenow={Math.min(thisWeek, goal)}
      >
        {Array.from({ length: goal }, (_, i) => (
          <span key={i} className={cn("h-2 w-5 rounded-full", i < thisWeek ? (met ? "bg-success" : "bg-foreground") : "bg-surface-2")} />
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        <span className={cn("font-medium", met ? "text-success" : undefined)}>
          {met ? "Goal met" : `${thisWeek} of ${goal}`}
        </span>{" "}
        this week
        {streak >= 2 && ` · ${streak}-week streak`}
      </p>
    </div>
  );
}
