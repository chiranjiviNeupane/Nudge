"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChipFilter } from "@/components/common/ChipFilter";
import { EmptyState, Page, PageHeader, Spinner } from "@/components/layout/Page";
import { ListSkeleton } from "@/components/layout/Skeleton";
import { useTemplates } from "@/lib/hooks/data";
import { CUSTOM_WORKOUTS, fetchSessionPage } from "@/lib/repositories/sessions";
import { formatRelativeDay, pluralize } from "@/lib/format";
import type { SessionSummary } from "@/lib/db/types";
import { errorMessage } from "@/lib/repositories/errors";

const PAGE_SIZE = 30;

function groupByMonth(sessions: SessionSummary[]): [string, SessionSummary[]][] {
  const groups = new Map<string, SessionSummary[]>();
  for (const s of sessions) {
    const label = new Date(s.completed_at).toLocaleDateString(undefined, { month: "long", year: "numeric" });
    groups.set(label, [...(groups.get(label) ?? []), s]);
  }
  return [...groups.entries()];
}

/** The loaded pages for one filter combination (`key`). */
type ListState = {
  key: string;
  sessions: SessionSummary[];
  total: number | null;
  hasMore: boolean;
  loading: boolean;
  error: string | null;
};

const emptyList = (key: string): ListState => ({
  key,
  sessions: [],
  total: null,
  hasMore: true,
  loading: false,
  error: null,
});

/**
 * Every finished workout, newest first, loaded a page at a time as you scroll.
 * Filter by routine and search by name (both server-side, so paging still works).
 */
export default function HistoryPage() {
  const templates = useTemplates();
  const [routine, setRoutine] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const filterKey = `${routine ?? ""}|${search}`;
  const [list, setList] = useState<ListState>(() => emptyList(filterKey));
  const inFlight = useRef<string | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);

  // Search as you type, without a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setSearch(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  // A new filter starts from the first page.
  if (list.key !== filterKey) setList(emptyList(filterKey));

  const loadMore = useCallback(async () => {
    const key = filterKey;
    if (inFlight.current === key) return;
    inFlight.current = key;
    const offset = list.key === key ? list.sessions.length : 0;
    // Results for a filter that's no longer selected are dropped.
    const update = (fn: (l: ListState) => ListState) => setList((l) => (l.key === key ? fn(l) : l));
    update((l) => ({ ...l, loading: true, error: null }));
    try {
      const page = await fetchSessionPage(offset, PAGE_SIZE, { templateId: routine, search });
      update((l) => {
        // Skip rows already shown, in case a workout was saved mid-scroll and shifted the pages.
        const seen = new Set(l.sessions.map((s) => s.id));
        return {
          ...l,
          sessions: [...l.sessions, ...page.sessions.filter((s) => !seen.has(s.id))],
          total: offset === 0 ? page.total : l.total,
          hasMore: page.sessions.length === PAGE_SIZE,
          loading: false,
        };
      });
    } catch (e) {
      update((l) => ({ ...l, loading: false, error: errorMessage(e, "Couldn’t load workouts") }));
    } finally {
      if (inFlight.current === key) inFlight.current = null;
    }
  }, [filterKey, list.key, list.sessions.length, routine, search]);

  // Load the next page whenever the bottom of the list comes near the screen.
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !list.hasMore || list.error) return;
    const io = new IntersectionObserver((entries) => entries[0]?.isIntersecting && void loadMore(), {
      rootMargin: "400px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore, list.hasMore, list.error]);

  const { sessions, hasMore, loading, error, total } = list;
  const filtered = routine !== null || search !== "";
  const busy = loading || (sessions.length === 0 && hasMore && !error);

  return (
    <Page full>
      <PageHeader
        title="History"
        subtitle={total !== null ? pluralize(total, "workout") : undefined}
      />

      {/* Large screens: search and routine filters in a sticky column beside the list. */}
      <div className="lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start lg:gap-10">
        <div className="mb-6 flex flex-col gap-3 lg:sticky lg:top-10 lg:mb-0">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search workouts…"
              className="h-12 rounded-xl border-0 bg-surface pl-10 text-base md:text-base"
              aria-label="Search workouts by name"
            />
          </div>
          {templates && templates.length > 0 && (
            <ChipFilter
              label="Filter by routine"
              options={[
                ...templates.map((t) => ({ value: t.id, label: t.name })),
                { value: CUSTOM_WORKOUTS, label: "Custom" },
              ]}
              value={routine}
              onChange={setRoutine}
            />
          )}
        </div>

        <div>
          {!hasMore && sessions.length === 0 && !error ? (
            filtered ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No workouts match.</p>
            ) : (
              <EmptyState title="No workouts yet">
                <p className="text-sm text-muted-foreground">Finished workouts will show up here.</p>
              </EmptyState>
            )
          ) : (
            <div className="flex flex-col gap-6">
              {groupByMonth(sessions).map(([month, items]) => (
                <section key={month} aria-label={month}>
                  <h2 className="mb-1 flex items-center gap-3 text-xs font-semibold text-muted-foreground">
                    {month}
                    <span aria-hidden className="h-px flex-1 bg-border" />
                    <span className="font-normal tabular-nums">{items.length}</span>
                  </h2>
                  <ul className="divide-y">
                    {items.map((s) => (
                      <li key={s.id}>
                        <Link
                          href={`/sessions/${s.id}?from=history`}
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
              ))}
            </div>
          )}

          <div ref={sentinel} className="flex flex-col items-center gap-3 py-8">
            {busy && !error && (sessions.length === 0 ? <ListSkeleton rows={6} className="w-full" /> : <Spinner />)}
            {error && (
              <>
                <p className="text-center text-sm text-muted-foreground">{error}</p>
                <Button variant="secondary" onClick={() => void loadMore()}>
                  Try again
                </Button>
              </>
            )}
            {!hasMore && sessions.length > PAGE_SIZE && (
              <p className="text-sm text-muted-foreground">That’s everything.</p>
            )}
          </div>
        </div>
      </div>
    </Page>
  );
}
