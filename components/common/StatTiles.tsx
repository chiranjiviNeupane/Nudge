import { cn } from "@/lib/utils";

/** A row of small figure tiles (label over value), two per row on phones. */
export function StatTiles({
  stats,
  className,
}: {
  stats: { label: string; value: string }[];
  className?: string;
}) {
  return (
    <dl className={cn("grid grid-cols-2 gap-3", stats.length === 3 && "sm:grid-cols-3", className)}>
      {stats.map((s) => (
        <div key={s.label} className="rounded-2xl bg-surface px-4 py-3">
          <dt className="text-xs text-muted-foreground">{s.label}</dt>
          <dd className="mt-1 text-xl font-semibold">{s.value}</dd>
        </div>
      ))}
    </dl>
  );
}
