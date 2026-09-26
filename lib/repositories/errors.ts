import type { PostgrestError } from "@supabase/supabase-js";

export class RepositoryError extends Error {
  constructor(
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

/** Throw a readable error for a Supabase response error. */
export function check(error: PostgrestError | null, context: string): void {
  if (!error) return;
  if (error.code === "23505") {
    throw new RepositoryError(`${context}: that name is already in use.`, error.code);
  }
  if (error.code === "23503") {
    throw new RepositoryError(`${context}: it is still in use elsewhere.`, error.code);
  }
  throw new RepositoryError(`${context}: ${error.message}`, error.code);
}
