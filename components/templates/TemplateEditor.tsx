"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Minus, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Page, PageHeader, SectionLabel } from "@/components/layout/Page";
import { ResponsiveModal } from "@/components/common/ResponsiveModal";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { ExercisePicker } from "@/components/exercises/ExercisePicker";
import type { TemplateWithExercises } from "@/lib/hooks/data";
import { deleteTemplate, saveTemplate } from "@/lib/repositories/templates";
import { DEFAULT_SETS } from "@/lib/workout/buildSession";
import { newId } from "@/lib/id";

type Item = { key: string; exerciseId: string; name: string; defaultSets: number };

const MIN_SETS = 1;
const MAX_SETS = 20;

export function TemplateEditor({ template }: { template: TemplateWithExercises | null }) {
  const router = useRouter();
  const [name, setName] = useState(template?.name ?? "");
  const [items, setItems] = useState<Item[]>(
    () =>
      template?.items.map((i) => ({
        key: i.id,
        exerciseId: i.exercise.id,
        name: i.exercise.name,
        defaultSets: i.defaultSets,
      })) ?? [],
  );
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const update = (key: string, patch: Partial<Item>) =>
    setItems((xs) => xs.map((x) => (x.key === key ? { ...x, ...patch } : x)));

  const move = (index: number, delta: -1 | 1) =>
    setItems((xs) => {
      const j = index + delta;
      if (j < 0 || j >= xs.length) return xs;
      const next = [...xs];
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });

  async function save() {
    if (!name.trim()) {
      toast.error("Give the workout a name.");
      return;
    }
    setSaving(true);
    try {
      await saveTemplate(
        template?.id ?? null,
        name,
        items.map((i) => ({ exerciseId: i.exerciseId, defaultSets: i.defaultSets })),
      );
      toast.success("Workout saved");
      router.push("/workouts");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
      setSaving(false);
    }
  }

  return (
    <Page wide className="pb-44 md:pb-32">
      <PageHeader
        title={template ? "Edit workout" : "New workout"}
        back={{ href: "/workouts", label: "Workouts" }}
        action={
          template && (
            <Button
              variant="ghost"
              size="icon-lg"
              aria-label="Delete workout"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="text-destructive" />
            </Button>
          )
        }
      />

      <div className="mb-8 flex flex-col gap-2">
        <Label htmlFor="template-name">Name</Label>
        <input
          id="template-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Push Day"
          maxLength={100}
          autoComplete="off"
          className="h-12 w-full rounded-xl bg-surface px-4 text-base font-medium outline-none placeholder:font-normal placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-primary"
        />
      </div>

      <SectionLabel>Exercises{items.length > 0 && ` · ${items.length}`}</SectionLabel>
      {items.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">No exercises yet.</p>
      ) : (
        <ol className="divide-y rounded-2xl border bg-card">
          {items.map((item, index) => (
            <li key={item.key} className="flex items-center gap-1 py-1.5 pr-1.5 pl-1">
              <div className="flex flex-col">
                <button
                  type="button"
                  className="flex h-6 w-8 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-surface hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-25"
                  aria-label={`Move ${item.name} up`}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  <ChevronUp className="size-4" />
                </button>
                <button
                  type="button"
                  className="flex h-6 w-8 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-surface hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-25"
                  aria-label={`Move ${item.name} down`}
                  disabled={index === items.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ChevronDown className="size-4" />
                </button>
              </div>

              <span className="min-w-0 flex-1 truncate font-medium">{item.name}</span>

              <div
                className="flex items-center rounded-lg bg-surface"
                role="group"
                aria-label={`Default sets for ${item.name}`}
              >
                <button
                  type="button"
                  className="flex size-9 items-center justify-center rounded-lg text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-30"
                  aria-label="Fewer sets"
                  disabled={item.defaultSets <= MIN_SETS}
                  onClick={() => update(item.key, { defaultSets: item.defaultSets - 1 })}
                >
                  <Minus className="size-4" />
                </button>
                <span className="numeric w-12 text-center text-sm">
                  {item.defaultSets} <span className="font-normal text-muted-foreground">sets</span>
                </span>
                <button
                  type="button"
                  className="flex size-9 items-center justify-center rounded-lg text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-30"
                  aria-label="More sets"
                  disabled={item.defaultSets >= MAX_SETS}
                  onClick={() => update(item.key, { defaultSets: item.defaultSets + 1 })}
                >
                  <Plus className="size-4" />
                </button>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="size-9 text-muted-foreground"
                aria-label={`Remove ${item.name}`}
                onClick={() => setItems((xs) => xs.filter((x) => x.key !== item.key))}
              >
                <X />
              </Button>
            </li>
          ))}
        </ol>
      )}

      <Button variant="secondary" size="cta" className="mt-3 w-full" onClick={() => setPicking(true)}>
        <Plus /> Add exercise
      </Button>

      {/* Sticky save bar, above the bottom nav on mobile. */}
      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t bg-background/90 backdrop-blur-lg md:bottom-0 md:left-60">
        <div className="mx-auto flex max-w-3xl gap-2 px-4 py-3 md:px-8">
          <Button variant="secondary" size="cta" className="flex-1" onClick={() => router.push("/workouts")}>
            Cancel
          </Button>
          <Button size="cta" className="flex-[2]" disabled={saving} onClick={save}>
            {saving ? "Saving…" : "Save workout"}
          </Button>
        </div>
      </div>

      <ResponsiveModal open={picking} onOpenChange={setPicking} title="Add exercise">
        <ExercisePicker
          excludeIds={items.map((i) => i.exerciseId)}
          onPick={(exercise) => {
            setItems((xs) => [
              ...xs,
              { key: newId(), exerciseId: exercise.id, name: exercise.name, defaultSets: DEFAULT_SETS },
            ]);
            setPicking(false);
          }}
        />
      </ResponsiveModal>

      {template && (
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title={`Delete ${template.name}?`}
          description="Your past workouts and exercise history are kept."
          confirmLabel="Delete"
          destructive
          onConfirm={async () => {
            try {
              await deleteTemplate(template.id);
              router.replace("/workouts");
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Could not delete");
            }
          }}
        />
      )}
    </Page>
  );
}
