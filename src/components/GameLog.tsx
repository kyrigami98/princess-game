"use client";

import { useEffect, useRef } from "react";
import type { LogEntry, PlayerID } from "@/lib/types";

interface Props {
  entries: LogEntry[];
  localRole?: PlayerID;
  className?: string;
}

const TYPE_TEXT: Record<LogEntry["type"], string> = {
  info: "text-slate-300",
  success: "text-emerald-400",
  danger: "text-red-400",
  warning: "text-amber-400",
};

export default function GameLog({ entries, localRole, className }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries]);

  function rowStyle(entry: LogEntry): string {
    if (!localRole || entry.player === "system") return "";
    if (entry.player === localRole) return "bg-indigo-950/30 border-l-2 border-indigo-500/50 pl-1.5 rounded-sm";
    return "bg-rose-950/20 border-l-2 border-rose-500/40 pl-1.5 rounded-sm";
  }

  function playerLabel(entry: LogEntry): string {
    if (entry.player === "system") return "Système";
    if (!localRole) return entry.player === "player1" ? "J1" : "J2";
    return entry.player === localRole ? "Vous" : "Adversaire";
  }

  function labelStyle(entry: LogEntry): string {
    if (entry.player === "system") return "text-slate-500";
    if (!localRole) return "text-slate-400";
    return entry.player === localRole ? "text-indigo-400" : "text-rose-400";
  }

  return (
    <div
      className={`overflow-y-auto rounded-xl bg-slate-950/60 border border-slate-800 p-3 space-y-1 text-xs ${className ?? "h-36 sm:h-44"}`}
    >
      {entries.map((entry) => (
        <div
          key={entry.id}
          className={`flex gap-1.5 ${TYPE_TEXT[entry.type]} ${rowStyle(entry)}`}
        >
          <span className="shrink-0 text-slate-600">[{entry.turn}]</span>
          <span className={`shrink-0 font-semibold ${labelStyle(entry)}`}>
            {playerLabel(entry)}
          </span>
          <span className="leading-snug">{entry.message}</span>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
