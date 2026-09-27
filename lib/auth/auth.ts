import { getSupabase } from "@/lib/supabase/client";
import { clearLocalData } from "@/lib/db/dexie";
import { isNetworkError, OFFLINE, UserFacingError } from "@/lib/repositories/errors";
import {
  getPreferences,
  preferencesFromMetadata,
  setLocalPreferences,
  toMetadata,
  type Preferences,
} from "@/lib/preferences";

/**
 * Email-only sign-in (no password, no confirmation email).
 *
 * Supabase Auth always needs a credential, so we derive one from the email.
 * This identifies users but is NOT secure: anyone who knows your email can
 * sign in as you. Everything credential-related lives in this file, so it can
 * be swapped for real passwords or one-time codes without touching the UI.
 */
// Every account's credential depends on this. Changing it means re-hashing every
// existing password in auth.users (possible in SQL, since it's derived from the email).
const derivePassword = (email: string) => `nudge::${email}::v2`;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

/** Message is a user-facing sentence. Setup problems are explained to the owner in the console instead. */
export class AuthError extends UserFacingError {}

// Shown when the Supabase project is misconfigured (only the owner can fix it).
const UNAVAILABLE = "Sign-in isn’t available right now. Please try again later.";
const CONFIRM_EMAIL_HINT =
  "[Nudge] Supabase requires email confirmation. Turn off “Confirm email” in Supabase → Authentication → Email.";

function unexpected(error: { message: string }): AuthError {
  if (isNetworkError(error)) return new AuthError(`Couldn’t sign in. ${OFFLINE}`);
  console.error("[Nudge] sign-in failed", error);
  return new AuthError("Couldn’t sign in. Please try again.");
}

function validEmail(rawEmail: string): string {
  const email = normalizeEmail(rawEmail);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AuthError("Enter a valid email address.");
  return email;
}

/**
 * Sign in to an existing account. "no-account" means nothing matched: the
 * login page then asks before creating one, so a typo doesn't silently make
 * a new empty account.
 */
export async function signInWithEmail(rawEmail: string): Promise<"signed-in" | "no-account"> {
  const email = validEmail(rawEmail);
  const signIn = await getSupabase().auth.signInWithPassword({ email, password: derivePassword(email) });
  if (!signIn.error) {
    rememberEmail(email);
    return "signed-in";
  }
  if (signIn.error.code === "email_not_confirmed") {
    console.warn(CONFIRM_EMAIL_HINT);
    throw new AuthError(UNAVAILABLE);
  }
  if (signIn.error.code === "invalid_credentials") return "no-account";
  throw unexpected(signIn.error);
}

/** Create an account for this email (after the user confirmed it) and sign in. */
export async function createAccount(rawEmail: string): Promise<void> {
  const email = validEmail(rawEmail);
  const signUp = await getSupabase().auth.signUp({ email, password: derivePassword(email) });
  if (signUp.error) {
    // An account made some other way (e.g. in the dashboard) with a different credential.
    if (signUp.error.code === "user_already_exists") {
      throw new AuthError("This email can’t be used to sign in here.");
    }
    throw unexpected(signUp.error);
  }
  if (!signUp.data.session) {
    console.warn(CONFIRM_EMAIL_HINT);
    throw new AuthError(UNAVAILABLE);
  }
  rememberEmail(email);
}

// The last email that signed in on this device, pre-filled on the login page
// so returning users don't retype (or mistype) it. Kept after sign-out on purpose.
const LAST_EMAIL_KEY = "last-email";

function rememberEmail(email: string) {
  try {
    localStorage.setItem(LAST_EMAIL_KEY, email);
  } catch {}
}

export function lastEmail(): string {
  try {
    return localStorage.getItem(LAST_EMAIL_KEY) ?? "";
  } catch {
    return "";
  }
}

export async function signOut(): Promise<void> {
  await getSupabase().auth.signOut();
  await clearLocalData();
}

export type CurrentUser = { id: string; email: string; preferences: Preferences };

/** Reads the locally stored session (no network round-trip). */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const { data } = await getSupabase().auth.getSession();
  const user = data.session?.user;
  return user
    ? { id: user.id, email: user.email ?? "", preferences: preferencesFromMetadata(user.user_metadata) }
    : null;
}

/** Saves settings (units, weekly goal) to the account so every device uses them. */
export async function savePreferences(patch: Partial<Preferences>): Promise<void> {
  const previous = getPreferences();
  setLocalPreferences(patch); // apply immediately; roll back if the account can't be updated
  const { error } = await getSupabase().auth.updateUser({ data: toMetadata(patch) });
  if (error) {
    setLocalPreferences(previous);
    if (isNetworkError(error)) throw new AuthError(`Couldn’t save settings. ${OFFLINE}`);
    console.error("[Nudge] saving settings failed", error);
    throw new AuthError("Couldn’t save settings. Please try again.");
  }
}

/** Picks up settings changed on another device (the cached session can be up to an hour old). */
export async function syncPreferences(): Promise<void> {
  const { data } = await getSupabase().auth.getUser();
  if (data.user) setLocalPreferences(preferencesFromMetadata(data.user.user_metadata));
}
