"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, type CurrentUser } from "@/lib/auth/auth";
import { Spinner } from "@/components/layout/Page";
import { ensureLocalUser, hasSynced, refreshAll } from "@/lib/sync/refresh";
import { setLocalPreferences } from "@/lib/preferences";
import { migrateLegacyDatabase } from "@/lib/db/dexie";
import { errorMessage } from "@/lib/repositories/errors";

type SessionState = {
  user: CurrentUser;
  /** True once the local cache holds this user's data (from a previous or the current sync). */
  ready: boolean;
  syncing: boolean;
  syncError: string | null;
  refresh: () => Promise<void>;
};

const SessionContext = createContext<SessionState | null>(null);

export function useSession(): SessionState {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>");
  return ctx;
}

/**
 * Resolves the signed-in user, makes sure the local cache belongs to them, and
 * keeps it fresh (on mount, on tab focus, and when coming back online).
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [ready, setReady] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const inFlight = useRef<Promise<void> | null>(null);

  const refresh = useCallback(async () => {
    if (inFlight.current) return inFlight.current;
    const run = (async () => {
      setSyncing(true);
      try {
        await refreshAll();
        setSyncError(null);
        setReady(true);
      } catch (e) {
        setSyncError(errorMessage(e, "Couldn’t sync"));
      } finally {
        setSyncing(false);
        inFlight.current = null;
      }
    })();
    inFlight.current = run;
    return run;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const current = await getCurrentUser();
      if (cancelled) return;
      if (!current) {
        router.replace("/login");
        return;
      }
      // Before anything reads the cache: bring over data from the old database name, once.
      await migrateLegacyDatabase();
      if (cancelled) return;
      await ensureLocalUser(current.id);
      setLocalPreferences(current.preferences);
      if (cancelled) return;
      setUser(current);
      // Show cached data immediately if we have it; refresh in the background.
      if (await hasSynced()) setReady(true);
      void refresh();
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh, router]);

  useEffect(() => {
    if (!user) return;
    let last = Date.now();
    const onFocus = () => {
      // Avoid hammering the API when quickly switching apps between sets.
      if (Date.now() - last < 30_000) return;
      last = Date.now();
      void refresh();
    };
    const onVisible = () => document.visibilityState === "visible" && onFocus();
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [user, refresh]);

  if (!user) return <FullScreenSpinner />;

  return (
    <SessionContext.Provider value={{ user, ready, syncing, syncError, refresh }}>
      {children}
    </SessionContext.Provider>
  );
}

export function FullScreenSpinner() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <Spinner />
    </div>
  );
}
