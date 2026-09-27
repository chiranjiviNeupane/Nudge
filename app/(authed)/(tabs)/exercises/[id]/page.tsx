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
import { ProgressChart } from "@/components/exercises/ProgressChart";
import { useExercise, useExerciseHistory } from "@/lib/hooks/data";
import { deleteExercise, refreshExerciseHistory, updateExercise } from "@/lib/repositories/exercises";
import { parseReturnParams, readReturn, RETURN_TO_EXERCISES } from "@/lib/navigation/returnTo";
import { formatMuscleGroups } from "@/lib/muscleGroups";
import { useIsWide } from "@/lib/hooks/useMediaQuery";
import { HeaderSkeleton, Skeleton } from "@/components/layout/Skeleton";
import { errorMessage } from "@/lib/repositories/errors";

export default function ExerciseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  // Opened from the live workout: the header link should return there, not to
  // the library. URL param first; tap-time note as fallback (see returnTo.ts).
  const fromUrl = parseReturnParams(useSearchParams());
  const remembered = useMemo(() => readReturn(id), [id]);
  const target = fromUrl ?? remembered ?? RETURN_TO_EXERCISES;
  // On wide screens the library is already beside this page, so "‹ Exercises" is redundant.
  const wide = useIsWide();
  const back = wide && target.href === RETURN_TO_EXERCISES.href ? undefined : target;
  const exercise = useExercise(id);
  const history = useExerciseHistory(id);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    refreshExerciseHistory(id).catch((e) =>
      setLoadError(errorMessage(e, "Couldn’t load history")),
    );
  }, [id]);

  if (exercise === undefined) {
    return (
      <Page wide>
        <HeaderSkeleton />
        <div className="mb-8 grid grid-cols-2 gap-3">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
        <Skeleton className="h-56 rounded-2xl" />
      </Page>
    );
  }
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
          formatMuscleGroups(exercise.muscle_groups) || null,
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
        <>
          <ProgressChart entries={history.entries} />
          <HistoryList entries={history.entries} />
        </>
      )}

      <ExerciseDialog
        open={editing}
        onOpenChange={setEditing}
        title="Edit exercise"
        initial={{
          name: exercise.name,
          kind: exercise.kind,
          trackIncline: exercise.track_incline,
          muscleGroups: exercise.muscle_groups ?? [],
        }}
        onSubmit={(input) => updateExercise(exercise.id, input)}
      />
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete ${exercise.name}?`}
        description="This can’t be undone. Exercises used in a routine or in your history can’t be deleted."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          try {
            await deleteExercise(exercise.id);
            router.replace("/exercises");
          } catch (e) {
            toast.error(errorMessage(e, "Couldn’t delete exercise"));
          }
        }}
      />
    </Page>
  );
}
