// Remembers which screen opened an exercise's history, so its header link
// can return there. Recorded at tap time (sessionStorage) in addition to the
// `?from=` URL param, because the client router can reuse a cached page
// without the param.

export type ReturnTarget = { href: string; label: string };

const KEY = "history-return";

export const RETURN_TO_EXERCISES: ReturnTarget = { href: "/exercises", label: "Exercises" };
export const RETURN_TO_WORKOUT: ReturnTarget = { href: "/workout", label: "Workout" };

export function rememberReturn(exerciseId: string, target: ReturnTarget) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ exerciseId, ...target }));
  } catch {}
}

export function readReturn(exerciseId: string): ReturnTarget | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as { exerciseId: string } & ReturnTarget;
    return v.exerciseId === exerciseId ? { href: v.href, label: v.label } : null;
  } catch {
    return null;
  }
}

/** Build a history link that returns to `target` (encoded in the URL). */
export function historyHref(exerciseId: string, target: ReturnTarget): string {
  const q = new URLSearchParams({ back: target.href, label: target.label });
  return `/exercises/${exerciseId}?${q}`;
}

/** Read the return target from the URL. Only same-site paths are accepted. */
export function parseReturnParams(params: URLSearchParams): ReturnTarget | null {
  if (params.get("from") === "workout") return RETURN_TO_WORKOUT;
  const href = params.get("back");
  if (!href || !href.startsWith("/") || href.startsWith("//")) return null;
  return { href, label: params.get("label") || "Back" };
}
