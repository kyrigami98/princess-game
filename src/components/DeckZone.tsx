"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  label: string;
  count: number;
  icon: string;
  tone: "indigo" | "rose";
}

const TONE_STYLES: Record<
  Props["tone"],
  { border: string; bg: string; glow: string; chip: string; topBorder: string }
> = {
  indigo: {
    border: "border-indigo-700/50",
    bg: "bg-indigo-950/70",
    glow: "shadow-indigo-500/20",
    chip: "bg-indigo-900/80 text-indigo-200 border-indigo-600/60",
    topBorder: "border-indigo-500/60",
  },
  rose: {
    border: "border-rose-700/50",
    bg: "bg-rose-950/70",
    glow: "shadow-rose-500/20",
    chip: "bg-rose-900/80 text-rose-200 border-rose-600/60",
    topBorder: "border-rose-500/60",
  },
};

export default function DeckZone({ label, count, icon, tone }: Props) {
  const prevCount = useRef(count);
  const [drawBursts, setDrawBursts] = useState<number[]>([]);
  const style = TONE_STYLES[tone];

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

  return (
    <div className="flex flex-col items-center gap-1 shrink-0">
      <span className="text-[8px] text-slate-500 uppercase tracking-wider font-semibold">
        {label}
      </span>

      {/* Pile visuelle */}
      <div className="relative w-9 h-13">
        {/* Layer 3 - fond */}
        <div
          className={`absolute inset-0 rounded-md border ${style.border} ${style.bg} translate-x-1 translate-y-1`}
        />
        {/* Layer 2 */}
        <div
          className={`absolute inset-0 rounded-md border ${style.border} ${style.bg} translate-x-0.5 translate-y-0.5`}
        />
        {/* Top card */}
        <div
          className={`absolute inset-0 rounded-md border ${style.topBorder} bg-linear-to-br from-slate-800 to-slate-900 flex items-center justify-center text-xl shadow-lg ${style.glow}`}
        >
          {count > 0 ? icon : <span className="text-slate-600 text-sm">—</span>}
        </div>

        {/* Draw burst animations */}
        {drawBursts.map((burst) => (
          <div
            key={burst}
            className={`deck-draw-card absolute inset-0 rounded-md border border-amber-300/60 bg-amber-100/10`}
          />
        ))}

        {/* Count badge */}
        <span
          className={`absolute -top-1.5 -right-1.5 z-10 min-w-4 h-4 flex items-center justify-center rounded-full border text-[9px] font-bold px-1 ${style.chip}`}
        >
          {count}
        </span>
      </div>
    </div>
  );
}
