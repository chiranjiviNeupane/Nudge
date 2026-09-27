import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Centered content column used by every tab screen. `wide` for data-heavy
 * pages; `full` for pages that switch to two columns on large screens.
 */
export function Page({
  children,
  wide = false,
  full = false,
  className,
}: {
  children: React.ReactNode;
  wide?: boolean;
  full?: boolean;
  className?: string;
}) {
  return (
    <main
      className={cn(
        "mx-auto w-full px-4 pt-2 pb-28 md:px-8 md:pt-10 md:pb-12",
        full ? "max-w-2xl lg:max-w-5xl" : wide ? "max-w-3xl" : "max-w-2xl",
        className,
      )}
    >
      {children}
    </main>
  );
}

export function PageHeader({
  title,
  subtitle,
  back,
  action,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  back?: { href: string; label: string };
  action?: React.ReactNode;
}) {
  return (
    <header className="mb-6 md:mb-8">
      {back && (
        <Link
          href={back.href}
          className="-ml-2 mb-2 inline-flex h-9 items-center gap-0.5 rounded-md px-2 text-sm font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <ChevronLeft className="size-4" />
          {back.label}
        </Link>
      )}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="display truncate text-3xl md:text-4xl">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
    </header>
  );
}

/** Small muted section heading. */
export function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={cn("mb-2 flex items-center gap-1.5 text-sm font-medium text-muted-foreground", className)}>
      {children}
    </h2>
  );
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed px-6 py-12 text-center">
      <p className="display text-lg">{title}</p>
      {children}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn("size-6 animate-spin rounded-full border-2 border-surface-2 border-t-primary", className)}
    />
  );
}
