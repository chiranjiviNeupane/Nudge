"use client";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/layout/Page";
import { useSession } from "./SessionProvider";

/** Waits for the first sync on a fresh device before rendering data screens. */
export function Ready({ children }: { children: React.ReactNode }) {
  const { ready, syncError, refresh, syncing } = useSession();
  if (ready) return <>{children}</>;
  if (syncError) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <p className="text-sm text-muted-foreground">Couldn’t load your data.</p>
        <p className="max-w-sm text-xs text-muted-foreground">{syncError}</p>
        <Button variant="outline" size="lg" onClick={() => refresh()} disabled={syncing}>
          Try again
        </Button>
      </div>
    );
  }
  return (
    <div className="flex justify-center py-24">
      <Spinner />
    </div>
  );
}
