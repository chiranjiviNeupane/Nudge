import { getSupabase } from "@/lib/supabase/client";
import { db } from "@/lib/db/dexie";
import { newId } from "@/lib/id";
import type { TemplateExercise, WorkoutTemplate } from "@/lib/db/types";
import { check, RepositoryError } from "./errors";

export type TemplateItemInput = { exerciseId: string; defaultSets: number };

export async function fetchTemplates(): Promise<{
  templates: WorkoutTemplate[];
  templateExercises: TemplateExercise[];
}> {
  const supabase = getSupabase();
  const [t, te] = await Promise.all([
    supabase.from("workout_templates").select("*").order("created_at"),
    supabase.from("template_exercises").select("*").order("position"),
  ]);
  check(t.error, "Couldn’t load routines");
  check(te.error, "Couldn’t load routines");
  return { templates: t.data ?? [], templateExercises: te.data ?? [] };
}

/**
 * Create or update a template and replace its exercise list in one atomic call.
 * Handles rename, add, remove, reorder and default-set changes together.
 */
export async function saveTemplate(
  id: string | null,
  name: string,
  items: TemplateItemInput[],
): Promise<string> {
  const value = name.trim();
  if (!value) throw new RepositoryError("Give the routine a name.");
  const templateId = id ?? newId();

  const supabase = getSupabase();
  const { error } = await supabase.rpc("save_template", {
    p_id: templateId,
    p_name: value,
    p_items: items.map((i) => ({ exercise_id: i.exerciseId, default_sets: i.defaultSets })),
  });
  check(error, "Couldn’t save routine");

  // Re-read the canonical rows (server assigns template_exercise ids/timestamps).
  const [t, te] = await Promise.all([
    supabase.from("workout_templates").select("*").eq("id", templateId).single(),
    supabase.from("template_exercises").select("*").eq("template_id", templateId),
  ]);
  check(t.error, "Couldn’t reload routine");
  check(te.error, "Couldn’t reload routine");

  await db.transaction("rw", [db.templates, db.templateExercises], async () => {
    await db.templates.put(t.data);
    await db.templateExercises.where("template_id").equals(templateId).delete();
    await db.templateExercises.bulkPut(te.data ?? []);
  });
  return templateId;
}

export async function deleteTemplate(id: string): Promise<void> {
  const { error } = await getSupabase().from("workout_templates").delete().eq("id", id);
  check(error, "Couldn’t delete routine");
  await db.transaction("rw", [db.templates, db.templateExercises], async () => {
    await db.templates.delete(id);
    await db.templateExercises.where("template_id").equals(id).delete();
  });
}
