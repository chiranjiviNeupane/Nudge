"use client";

import Link from "next/link";
import { ChevronRight, Play, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Page, SectionLabel } from "@/components/layout/Page";
import { AddExamplesButton } from "@/components/templates/AddExamplesButton";
import { useActiveSession, useRecentSessions, useTemplates } from "@/lib/hooks/data";
import { useStartWorkout } from "@/components/workout/useStartWorkout";
import { suggestNextTemplate } from "@/lib/workout/suggest";
import { formatRelativeDay, greeting, pluralize } from "@/lib/format";
import { WeekProgress } from "@/components/home/WeekProgress";
import { Skeleton, ListSkeleton } from "@/components/layout/Skeleton";

function HomeSkeleton() {
  return (
    <Page full>
      <Skeleton className="h-9 w-56" />
      <Skeleton className="mt-3 h-4 w-40" />
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12">
        <Skeleton className="mt-6 h-48 rounded-2xl" />
        <ListSkeleton rows={4} className="mt-10 lg:mt-6" />
      </div>
    </Page>
  );
}

export default function HomePage() {
  const templates = useTemplates();
  const recent = useRecentSessions(10);
  const active = useActiveSession();
  const { start, starting } = useStartWorkout();

  if (templates === undefined || recent === undefined || active === undefined) return <HomeSkeleton />;

  const suggested = suggestNextTemplate(templates, recent);
  const others = templates.filter((t) => t.id !== suggested?.id);

  const lastDone = suggested ? recent.find((s) => s.template_id === suggested.id) : undefined;

  return (
    <Page full>
      <h1 className="display text-3xl md:text-4xl">{greeting()}</h1>
      <WeekProgress recent={recent} />

      {/* Large screens: today's workout and routines on the left, Recent on the right. */}
      <div className="lg:mt-2 lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-12">
        <div>
          <section className="mt-6 rounded-2xl border bg-card p-5 md:p-6">
            {active ? (
              <>
                <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <span className="size-1.5 rounded-full bg-foreground motion-safe:animate-pulse" /> In progress
                </p>
                <h2 className="display mt-2 text-2xl">{active.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {pluralize(active.exercises.filter((e) => !e.skipped).length, "exercise")} · started{" "}
                  {new Date(active.startedAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                </p>
                <Button asChild size="cta" className="mt-5 w-full md:w-auto">
                  <Link href="/workout">Resume workout</Link>
                </Button>
              </>
            ) : suggested ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Today’s workout
                  {lastDone && ` · last done ${formatRelativeDay(lastDone.completed_at).toLowerCase()}`}
                </p>
                <h2 className="display mt-1 text-2xl">{suggested.name}</h2>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {suggested.items.map((i) => i.exercise.name).join(" · ")}
                </p>
                <Button
                  size="cta"
                  className="mt-5 w-full md:w-auto"
                  disabled={starting !== null || suggested.items.length === 0}
                  onClick={() => start(suggested.id)}
                >
                  <Play className="fill-current" /> {starting === suggested.id ? "Starting…" : "Start workout"}
                </Button>
              </>
            ) : (
              <>
                <h2 className="display text-xl">Set up your first routine</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create your own routine, or start with Push / Pull / Leg Day.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button asChild size="cta">
                    <Link href="/workouts/new">
                      <Plus /> New routine
                    </Link>
                  </Button>
                  <AddExamplesButton />
                </div>
              </>
            )}
          </section>

          {!active && others.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {others.map((t) => (
                <Button
                  key={t.id}
                  variant="secondary"
                  className="h-10 rounded-full px-4 text-sm"
                  disabled={starting !== null || t.items.length === 0}
                  onClick={() => start(t.id)}
                >
                  {t.name}
                </Button>
              ))}
            </div>
          )}
        </div>

        {recent.length > 0 && (
          <section className="mt-10 lg:mt-6">
            <div className="mb-2 flex items-baseline justify-between">
              <SectionLabel className="mb-0">Recent</SectionLabel>
              <Link
                href="/history"
                className="-mr-2 rounded-md px-2 py-1 text-sm font-medium text-foreground outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                See all
              </Link>
            </div>
            <ul className="divide-y">
              {recent.slice(0, 5).map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/sessions/${s.id}`}
                    className="group -mx-2 flex items-center gap-3 rounded-lg px-2 py-3 outline-none hover:bg-surface/60 focus-visible:bg-surface"
                  >
                    <span className="min-w-0 flex-1 truncate font-medium">{s.name}</span>
                    <span className="shrink-0 text-sm text-muted-foreground">
                      {formatRelativeDay(s.completed_at)} · {pluralize(s.exercise_count, "exercise")}
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground/50 group-hover:text-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </Page>
  );
}
