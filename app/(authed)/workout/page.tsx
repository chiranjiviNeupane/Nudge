"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Flag, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FullScreenSpinner } from "@/components/providers/SessionProvider";
import { ResponsiveModal } from "@/components/common/ResponsiveModal";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { ExercisePicker } from "@/components/exercises/ExercisePicker";
import { ExerciseBlock, type ExerciseActions } from "@/components/workout/ExerciseBlock";
import { FinishDialog } from "@/components/workout/FinishDialog";
import type { ActiveSession } from "@/lib/db/types";
import {
  buildAddedExercise,
  discardActiveSession,
  finishWorkout,
  getActiveSession,
  putActiveSession,
} from "@/lib/repositories/activeSession";
import * as ops from "@/lib/workout/draftOps";
import { touch } from "@/lib/workout/staleness";
import { pluralize } from "@/lib/format";

export default function WorkoutPage() {
  const router = useRouter();
  // undefined = loading, null = no active workout.
  const [session, setSession] = useState<ActiveSession | null | undefined>(undefined);
  const [adding, setAdding] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    getActiveSession().then((s) => {
      if (s) setSession(s);
      else {
        setSession(null);
        router.replace("/");
      }
    });
  }, [router]);

  // Keep the scroll position per workout, so coming back from an exercise's
  // history lands where you left off instead of at the top.
  const sessionId = session?.sessionId;
  useEffect(() => {
    if (!sessionId) return;
    const key = `workout-scroll:${sessionId}`;
    try {
      const y = Number(sessionStorage.getItem(key) ?? 0);
      if (y > 0) requestAnimationFrame(() => window.scrollTo(0, y));
    } catch {}
    const onScroll = () => {
      try {
        sessionStorage.setItem(key, String(Math.round(window.scrollY)));
      } catch {}
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [sessionId]);

  // Every edit is persisted locally right away (survives reloads / phone lock).
  // Edits stamp updatedAt via touch(); merely opening the page does not.
  useEffect(() => {
    if (session) void putActiveSession(session);
  }, [session]);

  const actions: ExerciseActions = useMemo(() => {
    const apply = (fn: (s: ActiveSession) => ActiveSession) =>
      setSession((s) => (s ? touch(fn(s)) : s));
    return {
      updateSet: (exId, setId, patch) => apply((s) => ops.updateSet(s, exId, setId, patch)),
      addSet: (exId) => apply((s) => ops.addSet(s, exId)),
      removeSet: (exId, setId) => apply((s) => ops.removeSet(s, exId, setId)),
      setSkipped: (exId, skipped) => apply((s) => ops.setSkipped(s, exId, skipped)),
      remove: (exId) => apply((s) => ops.removeExercise(s, exId)),
      move: (exId, delta) => apply((s) => ops.moveExercise(s, exId, delta)),
    };
  }, []);

  if (!session) return <FullScreenSpinner />;

  const summary = ops.summarize(session);

  async function finish(mode: ops.SaveMode) {
    if (!session) return;
    setFinishing(true);
    try {
      await finishWorkout(session, new Date(), mode);
      toast.success("Workout saved");
      router.replace("/");
    } catch (e) {
      setFinishing(false);
      toast.error(
        `${e instanceof Error ? e.message : "Could not save"}. Your workout is still kept on this device. Try again.`,
      );
    }
  }

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur-lg">
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-1 px-2 md:px-4">
          <Button variant="ghost" size="icon-lg" className="size-10" asChild>
            <Link href="/" aria-label="Back to home (workout stays open)">
              <ChevronLeft className="size-5" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="display truncate text-base">{session.name}</h1>
            <p className="text-xs text-muted-foreground tabular-nums">
              {pluralize(summary.exercises, "exercise")} · {summary.doneSets}/{summary.totalSets} sets done
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-lg" className="size-10" aria-label="Workout options">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem className="h-10" onSelect={() => setAdding(true)}>
                <Plus /> Add exercise
              </DropdownMenuItem>
              <DropdownMenuItem
                className="h-10"
                variant="destructive"
                onSelect={() => setConfirmDiscard(true)}
              >
                <Trash2 /> Discard workout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {/* Progress: sets ticked off today. */}
        <div className="-mb-px h-0.5 w-full" role="progressbar" aria-label="Sets done" aria-valuemin={0} aria-valuemax={summary.totalSets} aria-valuenow={summary.doneSets}>
          <div
            className="h-full bg-primary transition-[width] duration-300"
            style={{ width: `${summary.totalSets ? (summary.doneSets / summary.totalSets) * 100 : 0}%` }}
          />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pt-1 pb-36 md:px-6">
        <div className="divide-y">
          {session.exercises.map((exercise, i) => (
            <ExerciseBlock
              key={exercise.id}
              exercise={exercise}
              index={i}
              isLast={i === session.exercises.length - 1}
              actions={actions}
            />
          ))}
        </div>

        {session.exercises.length === 0 && (
          <div className="rounded-2xl border border-dashed py-12 text-center">
            <p className="display text-lg">No exercises yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Add an exercise to get started.</p>
          </div>
        )}

        <Button
          variant="secondary"
          size="cta"
          className="mt-4 w-full"
          onClick={() => setAdding(true)}
        >
          <Plus /> Add exercise
        </Button>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-background from-70% to-transparent pt-5 pb-safe">
        <div className="mx-auto max-w-2xl px-4 pb-3 md:px-6">
          <Button
            size="cta"
            className="h-13 w-full"
            disabled={finishing}
            onClick={() => setConfirmFinish(true)}
          >
            {finishing ? "Saving…" : (
              <>
                <Flag /> Finish workout
              </>
            )}
          </Button>
        </div>
      </div>

      <ResponsiveModal open={adding} onOpenChange={setAdding} title="Add exercise" description="Only for today. Your workout template won’t change.">
        <ExercisePicker
          excludeIds={session.exercises.map((e) => e.exerciseId)}
          onPick={async (exercise) => {
            const draft = await buildAddedExercise(exercise);
            setSession((s) => (s ? touch(ops.addExercise(s, draft)) : s));
            setAdding(false);
            // Bring the new exercise into view.
            requestAnimationFrame(() =>
              window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }),
            );
          }}
        />
      </ResponsiveModal>

      <FinishDialog
        open={confirmFinish}
        onOpenChange={setConfirmFinish}
        session={session}
        onSave={(mode) => void finish(mode)}
      />

      <ConfirmDialog
        open={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        title="Discard workout?"
        description="Nothing from this session will be saved."
        confirmLabel="Discard"
        destructive
        onConfirm={async () => {
          await discardActiveSession();
          router.replace("/");
        }}
      />
    </div>
  );
}
