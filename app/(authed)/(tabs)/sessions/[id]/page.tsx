"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Page, PageHeader, Spinner } from "@/components/layout/Page";
import { useSessionDetail } from "@/lib/hooks/data";
import { refreshSessionDetail } from "@/lib/repositories/sessions";
import { historyHref, rememberReturn } from "@/lib/navigation/returnTo";
import { formatLongDate, formatSet, pluralize } from "@/lib/format";

/** Read-only summary of one finished workout, opened from "Recent" on Home. */
export default function SessionSummaryPage() {
  const { id } = useParams<{ id: string }>();
  const detail = useSessionDetail(id);
  const [status, setStatus] = useState<"loading" | "done" | "missing" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    refreshSessionDetail(id)
      .then((d) => setStatus(d ? "done" : "missing"))
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Could not load workout");
        setStatus("error");
      });
  }, [id]);

  const back = { href: "/", label: "Home" };

  if (!detail) {
    return (
      <Page>
        <PageHeader
          title={status === "missing" ? "Workout not found" : "Workout"}
          back={back}
        />
        {status === "loading" && (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        )}
        {status === "error" && <p className="text-sm text-muted-foreground">{error}</p>}
      </Page>
    );
  }

  const done = detail.exercises.filter((e) => !e.skipped);
  const setCount = done.reduce((n, e) => n + e.sets.length, 0);
  const returnHere = { href: `/sessions/${detail.id}`, label: detail.name };

  return (
    <Page>
      <PageHeader
        title={detail.name}
        subtitle={`${formatLongDate(detail.completed_at)} · ${pluralize(done.length, "exercise")} · ${pluralize(setCount, "set")}`}
        back={back}
      />

      <ul className="divide-y rounded-2xl border bg-card">
        {detail.exercises.map((e) =>
          e.skipped ? (
            <li key={e.id} className="flex items-baseline justify-between gap-3 px-4 py-3">
              <span className="truncate text-muted-foreground line-through decoration-muted-foreground/40">
                {e.name}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">Skipped</span>
            </li>
          ) : (
            <li key={e.id}>
              <Link
                href={historyHref(e.exercise_id, returnHere)}
                onClick={() => rememberReturn(e.exercise_id, returnHere)}
                className="group flex items-center gap-3 px-4 py-3 outline-none hover:bg-surface/60 focus-visible:bg-surface"
                aria-label={`${e.name}: view full history`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{e.name}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground tabular-nums">
                    {e.sets.map((s, i) => (
                      <span key={s.set_number} className="whitespace-nowrap">
                        {i > 0 && <span className="text-muted-foreground/50"> · </span>}
                        <span className="text-foreground">{formatSet(s, false)}</span>
                      </span>
                    ))}
                  </p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground/50 group-hover:text-foreground" />
              </Link>
            </li>
          ),
        )}
      </ul>
    </Page>
  );
}
