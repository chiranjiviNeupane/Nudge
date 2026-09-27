import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

// A static, decorative picture of the live workout for the login page's wide
// layout: shows what "pre-filled, beat last time, PR" means at a glance.
// Mirrors the real SetRow styles; hidden from assistive tech.

const SETS = [
  { kg: "82.5", reps: "8", done: true, delta: "+2.5 kg", pr: true },
  { kg: "82.5", reps: "8", done: true, delta: "+2.5 kg", pr: false },
  { kg: "80", reps: "8", done: false, delta: null, pr: false },
];

function Field({ children }: { children: React.ReactNode }) {
  return (
    <span className="numeric flex h-12 items-center justify-center rounded-xl bg-surface text-xl">{children}</span>
  );
}

export function AppPreview() {
  return (
    <div aria-hidden className="relative w-[23rem] select-none">
      <div className="rounded-3xl border bg-card p-6 shadow-[0_24px_60px_-20px_rgb(0_0_0/0.25)]">
        <div className="flex items-center justify-between">
          <p className="display text-lg">Bench Press</p>
          <span className="numeric text-xs text-muted-foreground">2/3</span>
        </div>
        <p className="mt-1 text-sm">
          <span className="text-muted-foreground">Last · Sep 24</span>{" "}
          <span className="tabular-nums">80 × 8 · 80 × 8 · 80 × 8</span>
        </p>

        <div className="mt-4 grid grid-cols-[1.75rem_1fr_1fr_3rem] gap-2 text-xs text-muted-foreground">
          <span className="text-center">Set</span>
          <span className="text-center">kg</span>
          <span className="text-center">Reps</span>
        </div>
        <div className="mt-1 flex flex-col gap-1.5">
          {SETS.map((s, i) => (
            <div key={i} className="grid grid-cols-[1.75rem_1fr_1fr_3rem] items-center gap-2">
              <span className={cn("numeric text-center text-sm", s.done ? "text-foreground" : "text-muted-foreground")}>
                {i + 1}
              </span>
              <Field>{s.kg}</Field>
              <Field>{s.reps}</Field>
              <span
                className={cn(
                  "flex h-12 items-center justify-center rounded-xl",
                  s.done ? "bg-foreground text-background" : "bg-surface text-muted-foreground/50",
                )}
              >
                <Check className="size-5" strokeWidth={2.5} />
              </span>
              {s.delta && (
                <p className="col-span-full -mt-1 flex items-center gap-2 pl-9 text-xs font-medium text-success">
                  ↑ {s.delta} vs last
                  {s.pr && (
                    <span className="rounded-sm bg-gold px-1.5 py-px text-[10px] font-semibold tracking-wide text-gold-foreground">
                      PR
                    </span>
                  )}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* A second, smaller card peeking out: this week's goal. */}
      <div className="absolute -right-10 -bottom-8 rounded-2xl border bg-card px-4 py-3 shadow-[0_16px_40px_-16px_rgb(0_0_0/0.25)]">
        <div className="flex gap-1">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={cn("h-2 w-5 rounded-full", i < 3 ? "bg-foreground" : "bg-surface-2")} />
          ))}
        </div>
        <p className="mt-2 text-sm">
          <span className="font-medium">3 of 4</span> <span className="text-muted-foreground">this week</span>
        </p>
      </div>
    </div>
  );
}
