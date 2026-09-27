import { cn } from "@/lib/utils";

// Grey placeholders in the shape of what's loading, so screens don't flash
// blank before the local cache answers. Hidden from screen readers; the page
// has its own loading semantics.

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("rounded-lg bg-surface motion-safe:animate-pulse", className)} />;
}

// Varied name widths so the placeholder reads as a list, not a barcode.
const WIDTHS = ["w-2/5", "w-1/2", "w-1/3", "w-3/5", "w-5/12"];

/** Rows like a plain list (name on the left, meta on the right). */
export function ListSkeleton({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div aria-hidden className={cn("flex flex-col", className)}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex h-12 items-center justify-between gap-6">
          <Skeleton className={cn("h-4", WIDTHS[i % WIDTHS.length])} />
          <Skeleton className="h-3 w-16 shrink-0" />
        </div>
      ))}
    </div>
  );
}

/** Title + subtitle, as PageHeader renders them. */
export function HeaderSkeleton() {
  return (
    <div aria-hidden className="mb-6 md:mb-8">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="mt-2 h-4 w-28" />
    </div>
  );
}
