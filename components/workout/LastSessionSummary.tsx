"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { formatSet, formatShortDate } from "@/lib/format";
import type { LastSession } from "@/lib/db/types";
import { rememberReturn, RETURN_TO_WORKOUT } from "@/lib/navigation/returnTo";

/** Only the single most recent session — full history lives on the exercise page. */
export function LastSessionSummary({
  exerciseId,
  last,
}: {
  exerciseId: string;
  last: LastSession | null;
}) {
  if (!last) {
    return <p className="text-sm text-muted-foreground">First time, no previous session</p>;
  }
  return (
    <Link
      href={`/exercises/${exerciseId}?from=workout`}
      onClick={() => rememberReturn(exerciseId, RETURN_TO_WORKOUT)}
      className="group -mx-2 flex items-start gap-2 rounded-lg px-2 py-1 text-sm outline-none hover:bg-surface focus-visible:bg-surface"
      aria-label={`Last session ${formatShortDate(last.completed_at)}. View full history`}
    >
      <span className="shrink-0 text-muted-foreground">Last · {formatShortDate(last.completed_at)}</span>
      <span className="min-w-0 flex-1 tabular-nums">
        {last.sets.map((s, i) => (
          <span key={s.set_number} className="whitespace-nowrap">
            {i > 0 && <span className="text-muted-foreground/50"> · </span>}
            {formatSet(s, false)}
          </span>
        ))}
      </span>
      <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground/50 group-hover:text-muted-foreground" />
    </Link>
  );
}
