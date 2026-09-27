"use client";

import { Dumbbell } from "lucide-react";
import { Page } from "@/components/layout/Page";
import { ExerciseLibrary } from "@/components/exercises/ExerciseLibrary";
import { useIsWide } from "@/lib/hooks/useMediaQuery";

export default function ExercisesPage() {
  const wide = useIsWide();

  // Wide screens show the library in the layout's side column; this is the empty detail pane.
  if (wide) {
    return (
      <Page className="flex min-h-dvh flex-col items-center justify-center text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-surface text-muted-foreground">
          <Dumbbell className="size-6" />
        </span>
        <p className="display mt-4 text-lg">Pick an exercise</p>
        <p className="mt-1 text-sm text-muted-foreground">Its best set, progress chart and history show here.</p>
      </Page>
    );
  }

  return (
    <Page>
      <ExerciseLibrary />
    </Page>
  );
}
