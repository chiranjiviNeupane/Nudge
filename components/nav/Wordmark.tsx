import { cn } from "@/lib/utils";

/** "Record" wordmark with a simple mark. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span aria-hidden className="flex size-7 items-center justify-center rounded-lg bg-primary">
        <span className="size-2.5 rounded-full bg-primary-foreground" />
      </span>
      <span className="display text-lg">Record</span>
    </span>
  );
}
