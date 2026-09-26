"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState, Page, PageHeader, Spinner } from "@/components/layout/Page";
import { ExerciseDialog } from "@/components/exercises/ExerciseDialog";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { HistoryList } from "@/components/exercises/HistoryList";
import { useExercise, useExerciseHistory } from "@/lib/hooks/data";
import { deleteExercise, refreshExerciseHistory, updateExercise } from "@/lib/repositories/exercises";
import { parseReturnParams, readReturn, RETURN_TO_EXERCISES } from "@/lib/navigation/returnTo";

export default function ExerciseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  // Opened from the live workout: the header link should return there, not to
  // the library. URL param first; tap-time record as fallback (see returnTo.ts).
  const fromUrl = parseReturnParams(useSearchParams());
  const remembered = useMemo(() => readReturn(id), [id]);
  const back = fromUrl ?? remembered ?? RETURN_TO_EXERCISES;
  const exercise = useExercise(id);
  const history = useExerciseHistory(id);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    refreshExerciseHistory(id).catch((e) =>
      setLoadError(e instanceof Error ? e.message : "Could not load history"),
    );
  }, [id]);

  if (exercise === undefined) return null;
  if (exercise === null) {
    return (
      <Page>
        <PageHeader title="Exercise not found" back={back} />
      </Page>
    );
  }

  const sessions = history?.entries.length ?? 0;

  return (
    <Page wide>
      <PageHeader
        title={exercise.name}
        subtitle={[
          exercise.kind === "timed" ? (exercise.track_incline ? "Timed · incline" : "Timed") : "Strength",
          history ? `${sessions} session${sessions === 1 ? "" : "s"}` : null,
        ]
          .filter(Boolean)
          .join(" · ")}
        back={back}
        action={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-lg" aria-label="Exercise options">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem className="h-10" onSelect={() => setEditing(true)}>
                <Pencil /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="h-10"
                variant="destructive"
                onSelect={() => setConfirmDelete(true)}
              >
                <Trash2 /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      {history === undefined || (history === null && !loadError) ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : history === null ? (
        <p className="text-sm text-muted-foreground">{loadError}</p>
      ) : history.entries.length === 0 ? (
        <EmptyState title="No history yet">
          <p className="text-sm text-muted-foreground">Sets you log in a workout will show up here.</p>
        </EmptyState>
      ) : (
        <HistoryList entries={history.entries} />
      )}

      <ExerciseDialog
        open={editing}
        onOpenChange={setEditing}
        title="Edit exercise"
        initial={{ name: exercise.name, kind: exercise.kind, trackIncline: exercise.track_incline }}
        onSubmit={(input) => updateExercise(exercise.id, input)}
      />
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete ${exercise.name}?`}
        description="Only exercises that aren't used in any workout or history can be deleted."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          try {
            await deleteExercise(exercise.id);
            router.replace("/exercises");
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Could not delete");
          }
        }}
      />
    </Page>
  );
}
