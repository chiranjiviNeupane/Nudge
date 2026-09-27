"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ChartLine, History, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createAccount, lastEmail, normalizeEmail, signInWithEmail } from "@/lib/auth/auth";
import { suggestEmail } from "@/lib/auth/emailSuggest";
import { Wordmark } from "@/components/nav/Wordmark";
import { AppPreview } from "@/components/login/AppPreview";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { errorMessage } from "@/lib/repositories/errors";

const configured = getSupabaseConfig() !== null;

const BENEFITS = [
  { icon: History, text: "Today’s sets pre-filled from last session" },
  { icon: Trophy, text: "PRs and “beat last time” spotted as you lift" },
  { icon: ChartLine, text: "Progress charts, streaks and a weekly goal" },
];

const noSubscribe = () => () => {};

export default function LoginPage() {
  const router = useRouter();
  // Pre-filled with the last email used on this device, until the user types.
  const saved = useSyncExternalStore(noSubscribe, lastEmail, () => "");
  const [typed, setTyped] = useState<string | null>(null);
  const email = typed ?? saved;
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // "Did you mean …?" for a likely typo, and an address the user chose to keep anyway.
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [kept, setKept] = useState<string | null>(null);
  // No account matched: ask before creating one, so a typo doesn't silently make a new account.
  const [confirming, setConfirming] = useState(false);

  const signedIn = () => {
    router.replace("/");
    router.refresh();
  };

  async function run(action: () => Promise<void>, fallback: string) {
    setPending(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(errorMessage(err, fallback));
    } finally {
      setPending(false);
    }
  }

  const trySignIn = (address: string) =>
    run(async () => {
      if ((await signInWithEmail(address)) === "signed-in") signedIn();
      else setConfirming(true);
    }, "Couldn’t sign in");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const fix = suggestEmail(email);
    if (fix && kept !== normalizeEmail(email)) {
      setSuggestion(fix);
      return;
    }
    void trySignIn(email);
  }

  return (
    <main className="relative isolate min-h-dvh overflow-hidden">
      {/* Soft accent glow behind the content. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-40 -z-10 h-[36rem] bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--primary)_22%,transparent),transparent)] md:-top-56 md:left-1/2 md:h-[44rem] md:w-[56rem] md:-translate-x-1/2 lg:left-1/4"
      />

      {/* Large screens: the form on the left, a picture of the app on the right. */}
      <div className="lg:grid lg:min-h-dvh lg:grid-cols-2">
        <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-6 py-10">
          <section>
            <Wordmark />

            <h1 className="display mt-10 text-4xl md:text-5xl">
              Log every set.
              <br />
              <span className="text-primary">Nudge it up.</span>
            </h1>
            <p className="mt-3 text-muted-foreground">
              A fast, focused workout log for your phone and desktop, synced everywhere. No feeds, no clutter.
            </p>

            {!configured ? (
              <div className="mt-8 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                Supabase isn’t configured yet. Add your project URL and key to{" "}
                <code className="text-foreground">.env.local</code> (see README), then restart{" "}
                <code>npm run dev</code>.
              </div>
            ) : confirming ? (
              <div className="mt-8 flex flex-col gap-3">
                <div className="rounded-xl border bg-card px-4 py-3 shadow-sm">
                  <p className="text-sm text-muted-foreground">No account for</p>
                  <p className="mt-0.5 text-lg font-semibold break-all">{normalizeEmail(email)}</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  If that’s right, create a new account. If not, fix the email to sign in to your existing one.
                </p>
                {error && (
                  <p role="alert" className="text-sm text-destructive">
                    {error}
                  </p>
                )}
                <Button
                  size="cta"
                  disabled={pending}
                  onClick={() => run(async () => {
                    await createAccount(email);
                    signedIn();
                  }, "Couldn’t create account")}
                >
                  {pending ? "Creating…" : "Create account"}
                </Button>
                <Button
                  size="cta"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => {
                    setConfirming(false);
                    setError(null);
                  }}
                >
                  Change email
                </Button>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-3">
                <Label htmlFor="email" className="sr-only">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoFocus
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => {
                    setTyped(e.target.value);
                    setSuggestion(null);
                  }}
                  className="h-12 rounded-xl border bg-card px-4 text-base shadow-sm md:text-base"
                />
                {suggestion && (
                  <div role="alert" className="rounded-xl bg-surface px-4 py-3 text-sm">
                    <p>
                      Did you mean <span className="font-semibold break-all">{suggestion}</span>?
                    </p>
                    <div className="mt-2 flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          setTyped(suggestion);
                          setSuggestion(null);
                          void trySignIn(suggestion);
                        }}
                      >
                        Use this
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setKept(normalizeEmail(email));
                          setSuggestion(null);
                          void trySignIn(email);
                        }}
                      >
                        Keep mine
                      </Button>
                    </div>
                  </div>
                )}
                {error && (
                  <p role="alert" className="text-sm text-destructive">
                    {error}
                  </p>
                )}
                <Button type="submit" size="cta" disabled={pending || suggestion !== null}>
                  {pending ? (
                    "Signing in…"
                  ) : (
                    <>
                      Continue <ArrowRight />
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground">
                  New here? Enter your email and you’ll be asked to create an account.
                </p>
              </form>
            )}

            <ul className="mt-10 flex flex-col gap-3 border-t pt-6">
              {BENEFITS.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-4" />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="hidden items-center justify-center border-l bg-surface/40 lg:flex">
          <AppPreview />
        </div>
      </div>
    </main>
  );
}
