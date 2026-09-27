"use client";

import { useEffect } from "react";

/**
 * Tracks the on-screen keyboard via the VisualViewport API, since iOS Safari
 * (and Android Chrome by default) leave `position: fixed; bottom: 0` behind it.
 *
 * Exposes on <html>:
 * - `--kb-inset`: height of the layout viewport hidden by the keyboard
 * - `--vvh`: height of the visible area
 * - `data-keyboard`: present while the keyboard is open
 */
export function KeyboardInset() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const root = document.documentElement;

    const measure = () => {
      const inset = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
      root.style.setProperty("--kb-inset", `${inset}px`);
      root.style.setProperty("--vvh", `${Math.round(vv.height)}px`);
      // Small insets are browser chrome (URL bar) resizing, not a keyboard.
      root.toggleAttribute("data-keyboard", inset > 120);
    };

    const onResize = () => {
      measure();
      // Only on resize (keyboard opening), so we never fight the user scrolling.
      keepFocusedVisible();
    };

    measure();
    vv.addEventListener("resize", onResize);
    vv.addEventListener("scroll", measure);
    return () => {
      vv.removeEventListener("resize", onResize);
      vv.removeEventListener("scroll", measure);
    };
  }, []);

  return null;
}

/** Scroll the page so a focused field on it isn't left under the keyboard. */
function keepFocusedVisible() {
  const el = document.activeElement;
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) revealAboveKeyboard(el);
}

/**
 * Scroll the page just enough that `el` sits above the keyboard, leaving room
 * for the +/− bar over set fields. Fields in dialogs/sheets move with the sheet instead.
 */
export function revealAboveKeyboard(el: HTMLElement) {
  const vv = window.visualViewport;
  if (!vv || el.closest("[role=dialog]")) return;
  const margin = el.hasAttribute("data-set-field") ? 72 : 16;
  const rect = el.getBoundingClientRect();
  const visibleBottom = vv.offsetTop + vv.height - margin;
  if (rect.bottom > visibleBottom) window.scrollBy({ top: rect.bottom - visibleBottom });
}
