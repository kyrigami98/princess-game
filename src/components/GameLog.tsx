"use client";

import { useEffect, useRef } from "react";
import type { LogEntry } from "@/lib/types";

interface Props {
  entries: LogEntry[];
}

const TYPE_STYLES: Record<LogEntry["type"], string> = {
  info: "text-slate-300",
  success: "text-emerald-400",
  danger: "text-red-400",
  warning: "text-amber-400",
};

const PLAYER_LABEL: Record<string, string> = {
  player1: "👑 Joueur 1",
  player2: "⚔️ Joueur 2",
  system: "📜",
};

export default function GameLog({ entries }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries]);

  return (
    <div className="h-36 sm:h-44 overflow-y-auto rounded-xl bg-slate-950/60 border border-slate-800 p-3 space-y-1 text-xs">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className={`flex gap-1.5 ${TYPE_STYLES[entry.type]}`}
        >
          <span className="shrink-0 font-semibold text-slate-500">
            [{entry.turn}]
          </span>
          <span className="shrink-0 font-semibold">
            {PLAYER_LABEL[entry.player] ?? entry.player}
          </span>
          <span>{entry.message}</span>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
