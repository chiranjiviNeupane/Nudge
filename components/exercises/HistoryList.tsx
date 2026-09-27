import { formatSet, formatShortDate } from "@/lib/format";
import type { HistoryEntry } from "@/lib/db/types";
import { useWeightUnit } from "@/lib/preferences";

/** Every logged session for one exercise, newest first. */
export function HistoryList({ entries }: { entries: HistoryEntry[] }) {
  const unit = useWeightUnit();
  return (
    <ol className="divide-y">
      {entries.map((entry) => (
        <li key={entry.session_id} className="py-4 first:pt-0">
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <h3 className="font-semibold">{formatShortDate(entry.completed_at)}</h3>
            <span className="truncate text-xs text-muted-foreground">{entry.session_name}</span>
          </div>
          {/* Sets in order, like the workout summary; wraps between sets, never inside one. */}
          <p className="leading-6 tabular-nums">
            {entry.sets.map((set, i) => (
              <span key={set.set_number} className="whitespace-nowrap">
                {i > 0 && <span className="text-muted-foreground/50"> · </span>}
                {formatSet(set, unit)}
              </span>
            ))}
          </p>
        </li>
      ))}
    </ol>
  );
}
