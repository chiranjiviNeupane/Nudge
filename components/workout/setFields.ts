import { formatDuration } from "@/lib/format";
import { parseDuration } from "@/lib/workout/draftOps";
import { revealAboveKeyboard } from "@/components/providers/KeyboardInset";

// DOM helpers for the set inputs (marked with data-set-field). Stepping writes
// through the native value setter + an input event, so each field's own React
// onChange (and its sanitising) runs exactly as if the value were typed.

export type SetFieldKind = "weight" | "reps" | "duration" | "incline";

const DURATION_STEP = 30; // seconds

/** Step size shown on the +/− bar, e.g. "2.5 kg", "1", "0:30". */
export function stepLabel(el: HTMLInputElement): string {
  const kind = el.dataset.setField as SetFieldKind;
  if (kind === "weight") return `${weightStep(el)} ${el.dataset.unit ?? "kg"}`;
  if (kind === "duration") return formatDuration(DURATION_STEP);
  if (kind === "incline") return "0.5 %";
  return "1";
}

const weightStep = (el: HTMLInputElement) => (el.dataset.unit === "lb" ? 5 : 2.5);

const toNumber = (v: string) => {
  const n = Number(v.trim().replace(",", "."));
  return v.trim() !== "" && Number.isFinite(n) ? n : null;
};

const round = (n: number, places: number) => Number(n.toFixed(places));

/** Add `dir` steps to a set field. An empty field starts from its placeholder (last session). */
export function stepField(el: HTMLInputElement, dir: 1 | -1) {
  const kind = el.dataset.setField as SetFieldKind;
  const raw = el.value.trim() !== "" ? el.value : el.placeholder;
  let next: string;
  if (kind === "duration") {
    const secs = parseDuration(raw) ?? 0;
    const value = Math.max(0, secs + dir * DURATION_STEP);
    next = value > 0 ? formatDuration(value) : "";
  } else {
    const current = toNumber(raw) ?? 0;
    const step = kind === "weight" ? weightStep(el) : kind === "incline" ? 0.5 : 1;
    const min = kind === "incline" ? -20 : 0;
    const max = kind === "incline" ? 100 : Infinity;
    next = String(round(Math.min(max, Math.max(min, current + dir * step)), 2));
  }
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setValue?.call(el, next);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

/** Focus the next set field in document order (or close the keyboard after the last). */
export function focusNextField(current: HTMLElement) {
  const fields = Array.from(document.querySelectorAll<HTMLInputElement>("[data-set-field]"));
  const next = fields[fields.indexOf(current as HTMLInputElement) + 1];
  if (!next) {
    current.blur();
    return;
  }
  next.focus();
  // Browsers scroll focused fields into view, but not clear of the +/− bar.
  requestAnimationFrame(() => revealAboveKeyboard(next));
}

export const isLastSetField = (el: HTMLElement) => {
  const fields = document.querySelectorAll("[data-set-field]");
  return fields[fields.length - 1] === el;
};
