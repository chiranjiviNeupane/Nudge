"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useActiveSession } from "@/lib/hooks/data";
import { discardActiveSession, finishWorkout } from "@/lib/repositories/activeSession";
import { isStale, lastActivity } from "@/lib/workout/staleness";
import { finishChoice, summarize, type SaveMode } from "@/lib/workout/draftOps";
import { formatRelativeDay, pluralize } from "@/lib/format";

// Drafts the user chose to resume stay quiet for the rest of this page load.
const dismissed = new Set<string>();

/**
 * Asks what to do with a workout that was probably never finished.
 * Never saves on its own: pre-filled sets the user didn't do would pollute
 * history and "last session".
 */
export function StaleWorkoutPrompt() {
  const router = useRouter();
  const active = useActiveSession();
  const [now, setNow] = useState(() => Date.now());
  const [, setDismissedCount] = useState(0);
  const [busy, setBusy] = useState(false);

  // Re-check when the app comes back to the foreground (phones keep tabs alive for days).
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") setNow(Date.now());
    };
    document.addEventListener("visibilitychange", onVisible);
    // Desktop tabs may never lose focus; re-check periodically too.
    const timer = setInterval(() => setNow(Date.now()), 5 * 60_000);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(timer);
    };
  }, []);

  if (!active || dismissed.has(active.sessionId) || !isStale(active, new Date(now))) return null;

  const last = lastActivity(active);
  const { loggedSets, exercises, tickedLogged } = summarize(active);
  const mixed = finishChoice(active) === "mixed";
  const when = `${formatRelativeDay(last.toISOString())}, ${last.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })}`;

  const dismiss = () => {
    dismissed.add(active.sessionId);
    setDismissedCount((n) => n + 1);
  };

  async function save(mode: SaveMode) {
    if (!active) return;
    setBusy(true);
    try {
      // Use the last edit as the finish time so history stays accurate.
      await finishWorkout(active, last, mode);
      toast.success(`Saved ${active.name}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AlertDialog open>
      <AlertDialogContent className="data-[size=default]:max-w-sm">
        <AlertDialogHeader>
          <p className="text-sm font-medium text-primary">Unfinished workout</p>
          <AlertDialogTitle className="display text-xl">{active.name}</AlertDialogTitle>
          <AlertDialogDescription>
            Last updated {when}.{" "}
            {loggedSets === 0
              ? "No sets were logged."
              : mixed
                ? `${pluralize(loggedSets, "set")} logged, ${tickedLogged} updated or ticked. Did you forget to tap Finish?`
                : `${pluralize(loggedSets, "set")} across ${pluralize(exercises, "exercise")} logged. Did you forget to tap Finish?`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-2">
          {loggedSets > 0 && !mixed && (
            <Button size="cta" disabled={busy} onClick={() => save("all")}>
              {busy ? "Saving…" : "Save it"}
            </Button>
          )}
          {mixed && (
            <>
              <Button size="cta" disabled={busy} onClick={() => save("all")}>
                Save all {loggedSets} sets
              </Button>
              <Button size="cta" variant="secondary" disabled={busy} onClick={() => save("ticked")}>
                Save only the {tickedLogged} I did
              </Button>
            </>
          )}
          <Button
            size="cta"
            variant={loggedSets > 0 ? "ghost" : "default"}
            disabled={busy}
            onClick={() => {
              dismiss();
              router.push("/workout");
            }}
          >
            Resume
          </Button>
          <Button
            variant="ghost"
            className="h-11 text-sm font-medium text-destructive hover:text-destructive"
            disabled={busy}
            onClick={async () => {
              await discardActiveSession();
              toast(`Discarded ${active.name}`);
            }}
          >
            Discard
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
