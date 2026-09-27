"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FullScreenSpinner } from "@/components/providers/SessionProvider";
import { readFinishSummary } from "@/components/workout/finishSummaryStore";
import type { FinishSummary } from "@/lib/workout/progress";
import { pluralize } from "@/lib/format";
import { StatTiles } from "@/components/common/StatTiles";

/** Shown right after Finish: what you did, and what you beat. */
export default function WorkoutDonePage() {
  const router = useRouter();
  // Safe to read on first render: signed-in pages only mount in the browser (see SessionProvider).
  const [summary] = useState<FinishSummary | null>(readFinishSummary);

  useEffect(() => {
    if (!summary) router.replace("/");
  }, [summary, router]);

  if (!summary) return <FullScreenSpinner />;

  // `?? []`: a summary saved by the previous app version, mid-deploy, has no `prs`.
  const prs = summary.prs ?? [];
  const stats = [
    { label: "Exercises", value: String(summary.exercises) },
    { label: "Sets", value: String(summary.sets) },
    { label: "Volume", value: summary.volume > 0 ? `${summary.volume.toLocaleString()} ${summary.unit}` : "—" },
    { label: "Beat last time", value: summary.improved > 0 ? pluralize(summary.improved, "set") : "—" },
  ];

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pt-16 pb-safe">
      <div className="flex flex-1 flex-col">
        <span className="flex size-14 items-center justify-center rounded-full bg-success text-background motion-safe:animate-tick-pop">
          <Check className="size-7" strokeWidth={2.5} />
        </span>
        <p className="mt-6 text-sm font-medium text-success">Workout saved</p>
        <h1 className="display mt-1 text-3xl">{summary.name}</h1>

        <StatTiles stats={stats} className="mt-8" />

        {prs.length > 0 && (
          <section className="mt-8" aria-labelledby="prs">
            <h2 id="prs" className="mb-2 flex items-center gap-1.5 text-sm font-medium">
              <Trophy className="size-4 text-gold-ink" />
              {prs.length === 1 ? "New personal record" : `${prs.length} new personal records`}
            </h2>
            <ul className="divide-y rounded-2xl border bg-card">
              {prs.map((r) => (
                <li key={r.exercise} className="flex items-baseline justify-between gap-3 px-4 py-3">
                  <span className="truncate font-medium">{r.exercise}</span>
                  <span className="numeric shrink-0 text-sm">{r.set}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <div className="flex flex-col gap-2 py-6">
        <Button asChild size="cta">
          <Link href="/">Done</Link>
        </Button>
        <Button asChild size="cta" variant="ghost">
          <Link href={`/sessions/${summary.sessionId}`}>View workout</Link>
        </Button>
      </div>
    </main>
  );
}
