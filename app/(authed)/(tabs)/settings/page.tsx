"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Page, PageHeader, SectionLabel } from "@/components/layout/Page";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useSession } from "@/components/providers/SessionProvider";
import { useActiveSession } from "@/lib/hooks/data";
import { signOut } from "@/lib/auth/auth";
import { cn } from "@/lib/utils";

const THEMES = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
] as const;

export default function SettingsPage() {
  const router = useRouter();
  const { user } = useSession();
  const active = useActiveSession();
  const { theme, setTheme } = useTheme();
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  async function doSignOut() {
    await signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <Page>
      <PageHeader title="Settings" />

      <section className="mb-8">
        <SectionLabel>Appearance</SectionLabel>
        <div className="grid grid-cols-3 rounded-xl bg-surface p-1" role="radiogroup" aria-label="Theme">
          {THEMES.map((t) => (
            <button
              key={t.value}
              type="button"
              role="radio"
              aria-checked={theme === t.value}
              onClick={() => setTheme(t.value)}
              className={cn(
                "h-10 rounded-lg text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary",
                theme === t.value
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <SectionLabel>Account</SectionLabel>
        <div className="flex items-center justify-between gap-3 rounded-2xl border bg-card px-4 py-3">
          <div className="min-w-0">
            <p className="truncate font-medium">{user.email}</p>
            <p className="text-xs text-muted-foreground">Your data syncs across devices automatically.</p>
          </div>
          <Button
            variant="secondary"
            className="h-9 shrink-0 px-3"
            onClick={() => (active ? setConfirmSignOut(true) : doSignOut())}
          >
            Sign out
          </Button>
        </div>
      </section>

      <ConfirmDialog
        open={confirmSignOut}
        onOpenChange={setConfirmSignOut}
        title="Sign out?"
        description="You have a workout in progress on this device. Signing out will discard it."
        confirmLabel="Sign out"
        destructive
        onConfirm={doSignOut}
      />
    </Page>
  );
}
