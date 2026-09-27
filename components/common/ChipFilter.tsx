"use client";

import { cn } from "@/lib/utils";

export const chipClass = (on: boolean) =>
  cn(
    "h-9 shrink-0 rounded-full px-3.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary",
    on ? "bg-foreground text-background" : "bg-surface text-muted-foreground hover:text-foreground",
  );

/**
 * Single-select row of pill filters, led by "All" (null). Scrolls sideways on
 * phones, wraps on desktop.
 */
export function ChipFilter<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T | null;
  onChange: (value: T | null) => void;
  className?: string;
}) {
  const all = [{ value: null, label: "All" }, ...options];
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0", className)}
    >
      {all.map((o) => (
        <button
          key={o.value ?? "all"}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={chipClass(value === o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
