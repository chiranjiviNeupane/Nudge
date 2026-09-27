import type { PostgrestError } from "@supabase/supabase-js";

/** An error whose message is a complete, user-facing sentence (safe to show in a toast). */
export class UserFacingError extends Error {}

export class RepositoryError extends UserFacingError {
  constructor(
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

/** A failed request that never reached the server (no signal, DNS, CORS…). */
export function isNetworkError(error: { message?: string } | null | undefined): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  return /failed to fetch|networkerror|load failed|network request failed/i.test(error?.message ?? "");
}

export const OFFLINE = "You seem to be offline.";

/**
 * Throw a readable error for a Supabase response error. `context` is the
 * first sentence, e.g. "Couldn’t save workout". Raw server text is never
 * shown; it goes to the console for debugging.
 */
export function check(error: PostgrestError | null, context: string): void {
  if (!error) return;
  if (isNetworkError(error)) throw new RepositoryError(`${context}. ${OFFLINE}`, error.code);
  if (error.code === "23505") throw new RepositoryError(`${context}. That name is already taken.`, error.code);
  if (error.code === "23503") throw new RepositoryError(`${context}. It’s still in use.`, error.code);
  console.error(context, error);
  throw new RepositoryError(`${context}. Please try again.`, error.code);
}

/**
 * The sentence to show for any caught error: its own message if it was
 * written for people, otherwise `fallback` plus a plain reason. Never shows
 * raw technical text.
 */
export function errorMessage(e: unknown, fallback: string): string {
  if (e instanceof UserFacingError) return e.message;
  if (isNetworkError(e instanceof Error ? e : null)) return `${fallback}. ${OFFLINE}`;
  console.error(fallback, e);
  return `${fallback}. Please try again.`;
}
