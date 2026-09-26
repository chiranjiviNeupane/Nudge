"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, History, MonitorSmartphone, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInWithEmail } from "@/lib/auth/auth";
import { Wordmark } from "@/components/nav/Wordmark";
import { getSupabaseConfig } from "@/lib/supabase/config";

const configured = getSupabaseConfig() !== null;

const BENEFITS = [
  { icon: History, text: "Today’s sets pre-filled from last session" },
  { icon: MonitorSmartphone, text: "Built for your phone, works on desktop" },
  { icon: RefreshCw, text: "Your log syncs across all your devices" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await signInWithEmail(email);
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
      setPending(false);
    }
  }

  return (
    <main className="relative isolate min-h-dvh overflow-hidden">
      {/* Soft accent glow behind the content. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-40 -z-10 h-[36rem] bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--primary)_22%,transparent),transparent)] md:-top-56 md:left-1/2 md:h-[44rem] md:w-[56rem] md:-translate-x-1/2"
      />

      <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-6 py-10">
        <section>
          <Wordmark />

          <h1 className="display mt-10 text-4xl md:text-5xl">
            Log every set.
            <br />
            <span className="text-primary">Beat last time.</span>
          </h1>
          <p className="mt-3 text-muted-foreground">
            A fast, focused workout log for the gym floor. No feeds, no clutter.
          </p>

          {!configured ? (
            <div className="mt-8 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
              Supabase isn’t configured yet. Add your project URL and key to{" "}
              <code className="text-foreground">.env.local</code> (see README), then restart{" "}
              <code>npm run dev</code>.
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
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-xl border bg-card px-4 text-base shadow-sm md:text-base"
              />
              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
              <Button type="submit" size="cta" disabled={pending}>
                {pending ? (
                  "Signing in…"
                ) : (
                  <>
                    Continue <ArrowRight />
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                New here? Enter any email and an account is created for you.
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
    </main>
  );
}
