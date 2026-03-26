"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  label: string;
  count: number;
  icon: string;
  tone: "indigo" | "rose";
  compact?: boolean;
  strip?: boolean; // ultra-compact inline chip, no stack visual
}

const TONE_STYLES: Record<
  Props["tone"],
  { border: string; glow: string; chip: string }
> = {
  indigo: {
    border: "border-indigo-600/50",
    glow: "shadow-indigo-500/20",
    chip: "bg-indigo-900/70 text-indigo-200 border-indigo-600/60",
  },
  rose: {
    border: "border-rose-600/50",
    glow: "shadow-rose-500/20",
    chip: "bg-rose-900/70 text-rose-200 border-rose-600/60",
  },
};

export default function DeckZone({
  label,
  count,
  icon,
  tone,
  compact = false,
  strip = false,
}: Props) {
  const prevCount = useRef(count);
  const [drawBursts, setDrawBursts] = useState<number[]>([]);

  useEffect(() => {
    if (count < prevCount.current) {
      const draws = prevCount.current - count;
      const ids = Array.from({ length: draws }).map(() => Math.random());
      setDrawBursts((current) => [...current, ...ids]);
      ids.forEach((id) => {
        setTimeout(() => {
          setDrawBursts((current) => current.filter((entry) => entry !== id));
        }, 700);
      });
    }
    prevCount.current = count;
  }, [count]);

  const style = TONE_STYLES[tone];

  // Strip mode: tiny inline chip with just icon + count
  if (strip) {
    return (
      <div className={`flex flex-col items-center gap-0.5 shrink-0`}>
        <span className="text-[8px] text-slate-500 uppercase tracking-wider font-semibold">
          {label}
        </span>
        <div
          className={`flex items-center gap-1 rounded-lg border ${style.border} bg-slate-900/70 px-1.5 py-1`}
        >
          <span className="text-sm leading-none">{icon}</span>
          <span className={`text-xs font-bold rounded px-1 ${style.chip}`}>
            {count}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative rounded-xl border ${style.border} bg-slate-900/70 ${compact ? "px-2 py-2" : "px-3 py-3"} shadow-lg ${style.glow}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
          {label}
        </span>
        <span
          className={`text-[11px] rounded-md border px-2 py-0.5 font-bold ${style.chip}`}
        >
          {count}
        </span>
      </div>

      <div className={`relative ${compact ? "h-16" : "h-20"}`}>
        <div
          className={`absolute ${compact ? "left-2 top-2" : "left-4 top-3"} ${compact ? "w-10 h-14" : "w-12 h-16"} rounded-lg border border-slate-700 bg-slate-800/90`}
        />
        <div
          className={`absolute ${compact ? "left-3 top-1.5" : "left-5 top-2.5"} ${compact ? "w-10 h-14" : "w-12 h-16"} rounded-lg border border-slate-600 bg-slate-800/90`}
        />
        <div
          className={`absolute ${compact ? "left-4 top-1" : "left-6 top-2"} ${compact ? "w-10 h-14 text-base" : "w-12 h-16 text-lg"} rounded-lg border border-slate-500 bg-linear-to-br from-slate-800 to-slate-900 flex items-center justify-center`}
        >
          {icon}
        </div>

        {drawBursts.map((burst) => (
          <div
            key={burst}
            className={`deck-draw-card absolute ${compact ? "left-4 top-1 w-10 h-14" : "left-6 top-2 w-12 h-16"} rounded-lg border border-amber-300/60 bg-amber-100/10`}
          />
        ))}
      </div>
    </div>
  );
}
