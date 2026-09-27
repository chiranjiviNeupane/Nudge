"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Page, PageHeader, SectionLabel } from "@/components/layout/Page";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useSession } from "@/components/providers/SessionProvider";
import { useActiveSession } from "@/lib/hooks/data";
import { toast } from "sonner";
import { savePreferences, signOut } from "@/lib/auth/auth";
import { usePreference, type Preferences } from "@/lib/preferences";
import type { WeightUnit } from "@/lib/units";
import { cn } from "@/lib/utils";
import { errorMessage } from "@/lib/repositories/errors";

const THEMES = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
] as const;

const UNITS: { value: WeightUnit; label: string }[] = [
  { value: "kg", label: "Kilograms (kg)" },
  { value: "lb", label: "Pounds (lb)" },
];

// "off" plus 1–7 workouts a week.
const GOALS = [{ value: "off", label: "Off" }, ...[1, 2, 3, 4, 5, 6, 7].map((n) => ({ value: String(n), label: String(n) }))];

function save(patch: Partial<Preferences>) {
  savePreferences(patch).catch((e) => toast.error(errorMessage(e, "Couldn’t save settings")));
}

/** Segmented control shared by the settings rows. */
function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T | undefined;
  onChange: (value: T) => void;
}) {
  return (
    <div
      className="grid auto-cols-fr grid-flow-col rounded-xl bg-surface p-1"
      role="radiogroup"
      aria-label={label}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "h-10 rounded-lg text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary",
            value === o.value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { user } = useSession();
  const active = useActiveSession();
  const { theme, setTheme } = useTheme();
  const unit = usePreference("weightUnit");
  const weeklyGoal = usePreference("weeklyGoal");
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
        <Segmented
          label="Theme"
          options={THEMES}
          value={theme as (typeof THEMES)[number]["value"] | undefined}
          onChange={setTheme}
        />
      </section>

      <section className="mb-8">
        <SectionLabel>Units</SectionLabel>
        <Segmented
          label="Weight unit"
          options={UNITS}
          value={unit}
          onChange={(u) => save({ weightUnit: u })}
        />
        <p className="mt-2 text-xs text-muted-foreground">
          Used for new workouts and all history. A workout already in progress keeps its unit.
        </p>
      </section>

      <section className="mb-8">
        <SectionLabel>Weekly goal</SectionLabel>
        <Segmented
          label="Workouts per week"
          options={GOALS}
          value={weeklyGoal === null ? "off" : String(weeklyGoal)}
          onChange={(v) => save({ weeklyGoal: v === "off" ? null : Number(v) })}
        />
        <p className="mt-2 text-xs text-muted-foreground">
          Workouts per week, Monday to Sunday. Home shows your progress and streak.
        </p>
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
