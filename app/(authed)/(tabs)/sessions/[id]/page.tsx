"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Page, PageHeader } from "@/components/layout/Page";
import { deleteSession } from "@/lib/repositories/sessionEdits";
import { useSessionDetail } from "@/lib/hooks/data";
import { refreshSessionDetail } from "@/lib/repositories/sessions";
import { historyHref, rememberReturn } from "@/lib/navigation/returnTo";
import { formatLongDate, formatSet } from "@/lib/format";
import { fromKg } from "@/lib/units";
import { StatTiles } from "@/components/common/StatTiles";
import { ListSkeleton, Skeleton } from "@/components/layout/Skeleton";
import { useWeightUnit } from "@/lib/preferences";
import { errorMessage } from "@/lib/repositories/errors";

/** Summary of one finished workout, opened from Home or History. Edit and delete live in its menu. */
export default function SessionSummaryPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const detail = useSessionDetail(id);
  const unit = useWeightUnit();
  const [status, setStatus] = useState<"loading" | "done" | "missing" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    refreshSessionDetail(id)
      .then((d) => setStatus(d ? "done" : "missing"))
      .catch((e) => {
        setError(errorMessage(e, "Couldn’t load workout"));
        setStatus("error");
      });
  }, [id]);

  const fromHistory = useSearchParams().get("from") === "history";
  const back = fromHistory ? { href: "/history", label: "History" } : { href: "/", label: "Home" };

  if (!detail) {
    return (
      <Page>
        <PageHeader
          title={status === "missing" ? "Workout not found" : "Workout"}
          back={back}
        />
        {status === "loading" && (
          <>
            <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3" aria-hidden>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-[74px] rounded-2xl" />
              ))}
            </div>
            <ListSkeleton rows={4} />
          </>
        )}
        {status === "error" && <p className="text-sm text-muted-foreground">{error}</p>}
      </Page>
    );
  }

  const done = detail.exercises.filter((e) => !e.skipped);
  const setCount = done.reduce((n, e) => n + e.sets.length, 0);
  const volumeKg = done.reduce((v, e) => v + e.sets.reduce((w, s) => w + (s.weight ?? 0) * (s.reps ?? 0), 0), 0);
  const stats = [
    { label: "Exercises", value: String(done.length) },
    { label: "Sets", value: String(setCount) },
    { label: "Volume", value: volumeKg > 0 ? `${Math.round(fromKg(volumeKg, unit)).toLocaleString()} ${unit}` : "—" },
  ];
  const suffix = fromHistory ? "?from=history" : "";
  const returnHere = { href: `/sessions/${detail.id}${suffix}`, label: detail.name };

  return (
    <Page>
      <PageHeader
        title={detail.name}
        subtitle={formatLongDate(detail.completed_at)}
        back={back}
        action={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-lg" aria-label="Workout options">
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem className="h-10" onSelect={() => router.push(`/sessions/${detail.id}/edit${suffix}`)}>
                <Pencil /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem className="h-10" variant="destructive" onSelect={() => setConfirmDelete(true)}>
                <Trash2 /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      <StatTiles stats={stats} className="mb-8" />

      <ul className="divide-y">
        {detail.exercises.map((e) =>
          e.skipped ? (
            <li key={e.id} className="flex items-baseline justify-between gap-3 py-3">
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
                className="group -mx-2 flex items-center gap-3 rounded-lg px-2 py-3 outline-none hover:bg-surface/60 focus-visible:bg-surface"
                aria-label={`${e.name}: view full history`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{e.name}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground tabular-nums">
                    {e.sets.map((s, i) => (
                      <span key={s.set_number} className="whitespace-nowrap">
                        {i > 0 && <span className="text-muted-foreground/50"> · </span>}
                        <span className="text-foreground">{formatSet(s, unit)}</span>
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

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete ${detail.name}?`}
        description="Its sets are removed from your history, and the next workout pre-fills from the session before it. This can’t be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          try {
            await deleteSession(detail.id, detail.exercises.map((e) => e.exercise_id));
            toast(`Deleted ${detail.name}`);
            router.replace(back.href);
          } catch (e) {
            toast.error(errorMessage(e, "Couldn’t delete workout"));
          }
        }}
      />
    </Page>
  );
}
