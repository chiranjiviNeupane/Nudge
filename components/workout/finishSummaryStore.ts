import type { FinishSummary } from "@/lib/workout/progress";

// Hands the just-finished workout's stats to /workout/done. Tab-scoped
// (sessionStorage), so a reload of that page still shows it but it never
// outlives the tab.

const KEY = "finish-summary";

export function saveFinishSummary(summary: FinishSummary) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(summary));
  } catch {}
}

export function readFinishSummary(): FinishSummary | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as FinishSummary) : null;
  } catch {
    return null;
  }
}
