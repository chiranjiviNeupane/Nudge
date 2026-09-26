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
import type { SessionSummary } from "@/lib/db/types";

function workoutsThisWeek(recent: SessionSummary[]): number {
  const now = new Date();
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
  return recent.filter((s) => new Date(s.completed_at) >= monday).length;
}

export default function HomePage() {
  const templates = useTemplates();
  const recent = useRecentSessions(10);
  const active = useActiveSession();
  const { start, starting } = useStartWorkout();

  if (templates === undefined || recent === undefined || active === undefined) return null;

  const suggested = suggestNextTemplate(templates, recent);
  const others = templates.filter((t) => t.id !== suggested?.id);
  const weekCount = workoutsThisWeek(recent);

  return (
    <Page>
      <h1 className="display text-3xl md:text-4xl">{greeting()}</h1>
      {recent.length > 0 && (
        <p className="mt-1 text-sm text-muted-foreground">
          {weekCount === 0
            ? "No workouts yet this week"
            : `${pluralize(weekCount, "workout")} this week`}
        </p>
      )}

      <section className="mt-6 rounded-2xl border bg-card p-5 md:p-6">
        {active ? (
          <>
            <p className="flex items-center gap-2 text-sm font-medium text-primary">
              <span className="size-1.5 rounded-full bg-primary" /> In progress
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
            <p className="text-sm text-muted-foreground">Today’s workout</p>
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
            <h2 className="display text-xl">Set up your first workout</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your own routine, or start with Push / Pull / Leg Day.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button asChild size="cta">
                <Link href="/workouts/new">
                  <Plus /> New workout
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

      {recent.length > 0 && (
        <section className="mt-10">
          <SectionLabel>Recent</SectionLabel>
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
    </Page>
  );
}
