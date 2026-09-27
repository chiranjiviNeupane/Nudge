import { cn } from "@/lib/utils";

/** The upward chevron: the mark in the wordmark and the app icons (app/icon.tsx). */
export const CHEVRON_POINTS = "6.5,14.5 12,9 17.5,14.5";

/**
 * "Nudge" wordmark: a bare blue up-chevron, then the name. No tile, so it stays
 * light next to content; the home-screen icons put the chevron on a tile.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <svg aria-hidden viewBox="0 0 24 24" className="-ml-1 size-7 text-primary">
        <polyline
          points={CHEVRON_POINTS}
          fill="none"
          stroke="currentColor"
          strokeWidth={3.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="display text-lg">Nudge</span>
    </span>
  );
}
