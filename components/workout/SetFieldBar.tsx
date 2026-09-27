"use client";

import { useEffect, useState } from "react";
import { ChevronRight, Minus, Plus } from "lucide-react";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import { cn } from "@/lib/utils";
import { focusNextField, isLastSetField, stepField, stepLabel } from "./setFields";

/**
 * Bar docked above the on-screen keyboard while a set field is focused:
 * −/+ by a sensible step, and Next (iPhone number pads have no Next key).
 * Touch screens only; on desktop the arrow keys step instead.
 */
export function SetFieldBar() {
  const touch = useMediaQuery("(pointer: coarse)");
  const [field, setField] = useState<HTMLInputElement | null>(null);

  useEffect(() => {
    const onFocusIn = (e: FocusEvent) =>
      setField(e.target instanceof HTMLInputElement && e.target.hasAttribute("data-set-field") ? e.target : null);
    // Focus moving to a bar button is prevented below, so any real focus loss hides the bar.
    const onFocusOut = (e: FocusEvent) => {
      if (!(e.relatedTarget instanceof HTMLInputElement && e.relatedTarget.hasAttribute("data-set-field"))) {
        setField(null);
      }
    };
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, []);

  // A removed set's field can vanish without a focusout.
  if (!touch || !field || !field.isConnected) return null;

  // Keep focus (and the keyboard) on the field while tapping the bar.
  const keepFocus = (e: React.PointerEvent) => e.preventDefault();
  const last = isLastSetField(field);
  const button =
    "flex h-11 items-center justify-center rounded-xl bg-surface text-foreground outline-none active:bg-surface-2";

  return (
    <div
      className="fixed inset-x-0 z-50 border-t bg-background/95 px-3 py-2 backdrop-blur-lg"
      style={{ bottom: "var(--kb-inset, 0px)" }}
      role="toolbar"
      aria-label="Set field controls"
    >
      <div className="mx-auto flex max-w-2xl items-center gap-2">
        <button
          type="button"
          className={cn(button, "w-14")}
          onPointerDown={keepFocus}
          onClick={() => stepField(field, -1)}
          aria-label={`Decrease by ${stepLabel(field)}`}
        >
          <Minus className="size-5" />
        </button>
        <span className="numeric w-16 text-center text-xs text-muted-foreground">± {stepLabel(field)}</span>
        <button
          type="button"
          className={cn(button, "w-14")}
          onPointerDown={keepFocus}
          onClick={() => stepField(field, 1)}
          aria-label={`Increase by ${stepLabel(field)}`}
        >
          <Plus className="size-5" />
        </button>
        <button
          type="button"
          className={cn(button, "ml-auto gap-1 bg-primary px-4 text-sm font-medium text-primary-foreground active:bg-primary/90")}
          onPointerDown={keepFocus}
          onClick={() => focusNextField(field)}
        >
          {last ? "Done" : (
            <>
              Next <ChevronRight className="size-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
