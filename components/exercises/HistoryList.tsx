import { formatSet, formatShortDate } from "@/lib/format";
import type { HistoryEntry } from "@/lib/db/types";

/** Every logged session for one exercise, newest first. */
export function HistoryList({ entries }: { entries: HistoryEntry[] }) {
  return (
    <ol className="divide-y">
      {entries.map((entry) => (
        <li key={entry.session_id} className="py-4 first:pt-0">
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <h3 className="font-semibold">{formatShortDate(entry.completed_at)}</h3>
            <span className="truncate text-xs text-muted-foreground">{entry.session_name}</span>
          </div>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(6.5rem,1fr))] gap-x-4 gap-y-0.5 tabular-nums">
            {entry.sets.map((set) => (
              <li key={set.set_number} className="flex gap-2">
                <span className="w-4 text-right text-xs leading-6 text-muted-foreground">{set.set_number}</span>
                <span className="leading-6">{formatSet(set, false)}</span>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}
