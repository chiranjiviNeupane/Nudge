"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Page, PageHeader, Spinner } from "@/components/layout/Page";
import { ResponsiveModal } from "@/components/common/ResponsiveModal";
import { ExercisePicker } from "@/components/exercises/ExercisePicker";
import { ExerciseBlock } from "@/components/workout/ExerciseBlock";
import { SetFieldBar } from "@/components/workout/SetFieldBar";
import { useDraftActions } from "@/components/workout/useDraftActions";
import { db } from "@/lib/db/dexie";
import type { ActiveSession, Exercise } from "@/lib/db/types";
import { refreshSessionDetail } from "@/lib/repositories/sessions";
import { updateSession } from "@/lib/repositories/sessionEdits";
import { buildDraftExercise, DEFAULT_SETS } from "@/lib/workout/buildSession";
import { detailToDraft } from "@/lib/workout/editDraft";
import * as ops from "@/lib/workout/draftOps";
import { getWeightUnit } from "@/lib/preferences";
import { errorMessage } from "@/lib/repositories/errors";

/** Fix a finished workout: rename it, change or remove sets, add or remove exercises. */
export default function EditSessionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const suffix = useSearchParams().get("from") === "history" ? "?from=history" : "";
  const summaryHref = `/sessions/${id}${suffix}`;

  // undefined = loading, null = not found / failed.
  const [draft, setDraft] = useState<ActiveSession | null | undefined>(undefined);
  const [originalIds, setOriginalIds] = useState<string[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const actions = useDraftActions(draft, setDraft);

  // Always edit the server's latest version, never a stale cache.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const detail = await refreshSessionDetail(id);
        if (cancelled) return;
        if (!detail) {
          setDraft(null);
          return;
        }
        const ids = detail.exercises.map((e) => e.exercise_id);
        const cached = await db.exercises.bulkGet(ids);
        const exercises = new Map(cached.filter((e): e is Exercise => !!e).map((e) => [e.id, e]));
        if (cancelled) return;
        setOriginalIds(ids);
        setDraft(detailToDraft(detail, exercises, getWeightUnit()));
      } catch (e) {
        if (cancelled) return;
        setLoadError(errorMessage(e, "Couldn’t load workout"));
        setDraft(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const back = { href: summaryHref, label: "Cancel" };

  if (!draft) {
    return (
      <Page>
        <PageHeader title="Edit workout" back={back} />
        {draft === undefined ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{loadError ?? "This workout no longer exists."}</p>
        )}
      </Page>
    );
  }

  async function save() {
    if (!draft) return;
    if (!draft.name.trim()) {
      toast.error("Give the workout a name.");
      return;
    }
    // Completed time is kept by the server; passing it only satisfies the payload shape.
    const payload = ops.toSavePayload(draft, new Date(draft.startedAt), "all");
    if (!payload.exercises.some((e) => e.status === "completed")) {
      toast.error("No sets left to save. Delete the workout instead.");
      return;
    }
    setSaving(true);
    try {
      await updateSession(payload, originalIds);
      toast.success("Changes saved");
      router.replace(summaryHref);
    } catch (e) {
      setSaving(false);
      toast.error(errorMessage(e, "Couldn’t save changes"));
    }
  }

  const unit = draft.weightUnit ?? "kg";

  return (
    <Page className="pb-44 md:pb-32">
      <PageHeader title="Edit workout" back={back} />

      <div className="mb-4 flex flex-col gap-2">
        <Label htmlFor="session-name">Name</Label>
        <input
          id="session-name"
          value={draft.name}
          onChange={(e) => setDraft((d) => (d ? { ...d, name: e.target.value } : d))}
          maxLength={100}
          autoComplete="off"
          className="h-12 w-full rounded-xl bg-surface px-4 text-base font-medium outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
      </div>
      <p className="mb-2 text-xs text-muted-foreground">
        Clearing a set’s reps (or time) removes it when you save.
      </p>

      <div className="divide-y">
        {draft.exercises.map((exercise, i) => (
          <ExerciseBlock
            key={exercise.id}
            exercise={exercise}
            index={i}
            isLast={i === draft.exercises.length - 1}
            actions={actions}
            unit={unit}
            mode="edit"
          />
        ))}
      </div>

      <Button variant="secondary" size="cta" className="mt-4 w-full" onClick={() => setAdding(true)}>
        <Plus /> Add exercise
      </Button>

      {/* Save bar, above the bottom nav on mobile. */}
      <div
        data-hide-on-keyboard
        className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t bg-background/90 backdrop-blur-lg md:bottom-0 md:left-60"
      >
        <div className="mx-auto flex max-w-2xl gap-2 px-4 py-3 md:px-8">
          <Button variant="secondary" size="cta" className="flex-1" onClick={() => router.push(summaryHref)}>
            Cancel
          </Button>
          <Button size="cta" className="flex-[2]" disabled={saving} onClick={save}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>

      <SetFieldBar />

      <ResponsiveModal open={adding} onOpenChange={setAdding} title="Add exercise">
        <ExercisePicker
          excludeIds={draft.exercises.map((e) => e.exerciseId)}
          onPick={(exercise) => {
            const added = buildDraftExercise(exercise, null, DEFAULT_SETS, unit);
            setDraft((d) => (d ? ops.addExercise(d, added) : d));
            setAdding(false);
          }}
        />
      </ResponsiveModal>
    </Page>
  );
}
