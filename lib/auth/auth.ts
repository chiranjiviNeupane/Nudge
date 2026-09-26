import { getSupabase } from "@/lib/supabase/client";
import { clearLocalData } from "@/lib/db/dexie";

/**
 * Email-only sign-in (no password, no confirmation email).
 *
 * Supabase Auth always needs a credential, so we derive one from the email.
 * This identifies users but is NOT secure: anyone who knows your email can
 * sign in as you. Everything credential-related lives in this file, so it can
 * be swapped for real passwords or one-time codes without touching the UI.
 */
const derivePassword = (email: string) => `record-app::${email}::v1`;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export class AuthError extends Error {}

export async function signInWithEmail(rawEmail: string): Promise<void> {
  const email = normalizeEmail(rawEmail);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AuthError("Enter a valid email address.");
  }
  const supabase = getSupabase();
  const password = derivePassword(email);

  const signIn = await supabase.auth.signInWithPassword({ email, password });
  if (!signIn.error) return;
  if (signIn.error.code === "email_not_confirmed") {
    throw new AuthError(
      "This account is waiting for email confirmation. Turn off “Confirm email” in Supabase → Authentication → Email.",
    );
  }
  if (signIn.error.code !== "invalid_credentials") {
    throw new AuthError(signIn.error.message);
  }

  // No account yet (or one created some other way) — try creating it.
  const signUp = await supabase.auth.signUp({ email, password });
  if (signUp.error) {
    if (signUp.error.code === "user_already_exists") {
      throw new AuthError("An account with this email exists but can't be signed into here.");
    }
    throw new AuthError(signUp.error.message);
  }
  if (!signUp.data.session) {
    throw new AuthError(
      "Account created, but Supabase requires email confirmation. Turn off “Confirm email” in Supabase → Authentication → Email.",
    );
  }
}

export async function signOut(): Promise<void> {
  await getSupabase().auth.signOut();
  await clearLocalData();
}

export type CurrentUser = { id: string; email: string };

/** Reads the locally stored session (no network round-trip). */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const { data } = await getSupabase().auth.getSession();
  const user = data.session?.user;
  return user ? { id: user.id, email: user.email ?? "" } : null;
}
