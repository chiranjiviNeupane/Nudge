"use client";

import { useParams } from "next/navigation";
import { ExerciseLibrary } from "@/components/exercises/ExerciseLibrary";
import { useIsWide } from "@/lib/hooks/useMediaQuery";

/**
 * Wide screens (≥1024px): the library stays in a sticky column beside the
 * selected exercise, so browsing doesn't mean going back and forth. Phones:
 * the library and each exercise are separate pages.
 */
export default function ExercisesLayout({ children }: { children: React.ReactNode }) {
  const wide = useIsWide();
  const { id } = useParams<{ id?: string }>();
  if (!wide) return children;

  return (
    <div className="flex">
      <aside className="sticky top-0 h-dvh w-80 shrink-0 overflow-y-auto border-r px-6 pt-10 pb-12">
        <ExerciseLibrary sidebar activeId={id} />
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
