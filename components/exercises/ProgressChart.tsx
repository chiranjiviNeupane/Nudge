"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { HistoryEntry } from "@/lib/db/types";
import { formatDuration, formatSet, formatShortDate } from "@/lib/format";
import { fromKg, type WeightUnit } from "@/lib/units";
import { useWeightUnit } from "@/lib/preferences";
import { progressSeries, type ProgressMetric, type ProgressPoint } from "@/lib/workout/progress";

const HEIGHT = 180;
const PAD = { top: 16, right: 16, bottom: 24, left: 40 };

const TITLES: Record<ProgressMetric, { title: string; best: string }> = {
  e1rm: { title: "Estimated 1RM", best: "Est. 1RM" },
  reps: { title: "Most reps", best: "Most reps" },
  duration: { title: "Longest set", best: "Longest" },
};

function formatValue(metric: ProgressMetric, value: number, unit: WeightUnit, withUnit = true): string {
  if (metric === "duration") return formatDuration(Math.round(value));
  if (metric === "reps") return String(value);
  const v = Math.round(fromKg(value, unit));
  return withUnit ? `${v} ${unit}` : String(v);
}

/** Round tick values covering [min, max], about `count` of them. */
function niceTicks(min: number, max: number, count = 4): number[] {
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const raw = (max - min) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const ticks: number[] = [];
  for (let t = Math.floor(min / step) * step; t <= max + step * 0.001; t += step) ticks.push(Number(t.toFixed(6)));
  if (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + step);
  return ticks;
}

/** Best set each session over time, with the all-time best above it. */
export function ProgressChart({ entries }: { entries: HistoryEntry[] }) {
  const unit = useWeightUnit();
  const { metric, points, best } = useMemo(() => progressSeries(entries), [entries]);
  const titles = TITLES[metric];

  if (!best) return null;

  return (
    <section className="mb-8" aria-label="Progress">
      <dl className="mb-3 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-surface px-4 py-3">
          <dt className="text-xs text-muted-foreground">All-time best</dt>
          <dd className="mt-1 text-xl font-semibold">{formatSet(best.set, unit)}</dd>
          <dd className="text-xs text-muted-foreground">{formatShortDate(best.date)}</dd>
        </div>
        <div className="rounded-2xl bg-surface px-4 py-3">
          <dt className="text-xs text-muted-foreground">{titles.best}</dt>
          <dd className="mt-1 text-xl font-semibold">{formatValue(metric, best.value, unit)}</dd>
          {metric === "e1rm" && <dd className="text-xs text-muted-foreground">From your best set</dd>}
        </div>
      </dl>

      {points.length >= 2 ? (
        <div className="rounded-2xl border bg-card px-2 pt-3 pb-1">
          <p className="px-2 text-sm font-medium">{titles.title}</p>
          <p className="px-2 text-xs text-muted-foreground">Best set each session</p>
          <Plot points={points} metric={metric} unit={unit} />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">A progress chart appears after your second session.</p>
      )}
    </section>
  );
}

function Plot({ points, metric, unit }: { points: ProgressPoint[]; metric: ProgressMetric; unit: WeightUnit }) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(320);
  const [hover, setHover] = useState<number | null>(null);

  // Draw at the real pixel width so text and strokes never scale.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(200, Math.round(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Plot in display units so ticks are round numbers in kg or lb.
  const values = points.map((p) => (metric === "e1rm" ? fromKg(p.value, unit) : metric === "duration" ? p.value / 60 : p.value));
  const ticks = niceTicks(Math.min(...values), Math.max(...values));
  const yMin = ticks[0];
  const yMax = ticks[ticks.length - 1];
  const times = points.map((p) => new Date(p.date).getTime());
  const tMin = times[0];
  const tSpan = times[times.length - 1] - tMin || 1;

  const innerW = width - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + ((times[i] - tMin) / tSpan) * innerW;
  const y = (v: number) => PAD.top + (1 - (v - yMin) / (yMax - yMin || 1)) * innerH;

  const line = values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const area = `${line}L${x(values.length - 1).toFixed(1)},${PAD.top + innerH}L${x(0).toFixed(1)},${PAD.top + innerH}Z`;
  const showDots = points.length <= 40;
  const lastI = points.length - 1;
  const tickLabel = (t: number) => (metric === "duration" ? `${t}m` : String(t));

  // Snap the crosshair to the nearest session by x.
  const onPointer = (e: React.PointerEvent<SVGRectElement>) => {
    const px = e.clientX - e.currentTarget.getBoundingClientRect().left + PAD.left;
    let nearest = 0;
    for (let i = 1; i < points.length; i++) if (Math.abs(x(i) - px) < Math.abs(x(nearest) - px)) nearest = i;
    setHover(nearest);
  };

  const h = hover !== null ? points[hover] : null;
  const first = points[0];
  const summary = `${TITLES[metric].title} over ${points.length} sessions: ${formatValue(metric, first.value, unit)} on ${formatShortDate(first.date)}, ${formatValue(metric, points[lastI].value, unit)} on ${formatShortDate(points[lastI].date)}.`;

  return (
    <div ref={box} className="relative">
      <svg width={width} height={HEIGHT} role="img" aria-label={summary} className="block touch-pan-y select-none">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeWidth={1} />
            <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[11px] tabular-nums">
              {tickLabel(t)}
            </text>
          </g>
        ))}
        <text x={PAD.left} y={HEIGHT - 6} className="fill-muted-foreground text-[11px]">
          {formatShortDate(first.date)}
        </text>
        <text x={width - PAD.right} y={HEIGHT - 6} textAnchor="end" className="fill-muted-foreground text-[11px]">
          {formatShortDate(points[lastI].date)}
        </text>

        <path d={area} fill="var(--primary)" opacity={0.1} />
        <path d={line} fill="none" stroke="var(--primary)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {values.map((v, i) =>
          showDots || i === lastI ? (
            <circle key={i} cx={x(i)} cy={y(v)} r={4} fill="var(--primary)" stroke="var(--card)" strokeWidth={2} />
          ) : null,
        )}

        {h && hover !== null && (
          <g aria-hidden>
            <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + innerH} stroke="var(--muted-foreground)" strokeOpacity={0.5} strokeWidth={1} />
            <circle cx={x(hover)} cy={y(values[hover])} r={6} fill="var(--primary)" stroke="var(--card)" strokeWidth={2} />
          </g>
        )}

        {/* Hit area bigger than the line: anywhere in the plot finds the nearest session. */}
        <rect
          x={PAD.left}
          y={0}
          width={innerW}
          height={HEIGHT}
          fill="transparent"
          onPointerMove={onPointer}
          onPointerDown={onPointer}
          onPointerLeave={() => setHover(null)}
        />
      </svg>

      {h && hover !== null && (
        <div
          role="status"
          className="pointer-events-none absolute top-1 z-10 w-max rounded-lg border bg-popover px-2.5 py-1.5 text-xs shadow-sm"
          style={{
            left: Math.min(Math.max(x(hover) - 60, 4), width - 124),
          }}
        >
          <p className="text-muted-foreground">{formatShortDate(h.date)}</p>
          <p className="font-semibold tabular-nums">{formatValue(metric, h.value, unit)}</p>
          {metric === "e1rm" && <p className="text-muted-foreground tabular-nums">{formatSet(h.set, unit)} {unit}</p>}
        </div>
      )}
    </div>
  );
}
