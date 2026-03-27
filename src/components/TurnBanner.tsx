"use client";

import { useEffect, useRef, useState } from "react";
import type { GamePhase, PlayerID } from "@/lib/types";

interface Props {
  currentTurn: PlayerID;
  localRole: PlayerID;
  phase: GamePhase;
  localName: string;
  opponentName: string;
}

interface Banner {
  key: number;
  isLocal: boolean;
  localName: string;
  opponentName: string;
}

export default function TurnBanner({
  currentTurn,
  localRole,
  phase,
  localName,
  opponentName,
}: Props) {
  const [banner, setBanner] = useState<Banner | null>(null);
  const prevTurnRef = useRef<PlayerID | null>(null);
  const animKeyRef = useRef(0);

  useEffect(() => {
    if (phase === "game_over") return;

    const isFirst = prevTurnRef.current === null;
    const turnChanged = !isFirst && prevTurnRef.current !== currentTurn;

    if (isFirst || turnChanged) {
      animKeyRef.current += 1;
      setBanner({
        key: animKeyRef.current,
        isLocal: currentTurn === localRole,
        localName,
        opponentName,
      });
    }

    prevTurnRef.current = currentTurn;
  }, [currentTurn, localRole, phase, localName, opponentName]);

  if (!banner) return null;

  const isLocal = banner.isLocal;
  const accent = isLocal ? "#f59e0b" : "#8b5cf6";
  const accentLight = isLocal ? "#fde68a" : "#c4b5fd";
  const bg = isLocal
    ? "linear-gradient(105deg, rgba(92,40,5,0.97) 0%, rgba(60,25,2,0.98) 50%, rgba(92,40,5,0.97) 100%)"
    : "linear-gradient(105deg, rgba(35,15,70,0.97) 0%, rgba(18,8,42,0.98) 50%, rgba(35,15,70,0.97) 100%)";

  return (
    <div className="fixed inset-0 z-40 pointer-events-none flex items-center justify-center overflow-hidden">
      <style>{`
        @keyframes tbSlide {
          0%   { transform: translateX(-110vw); }
          18%  { transform: translateX(0); }
          68%  { transform: translateX(0); }
          100% { transform: translateX(110vw); }
        }
        @keyframes tbShine {
          0%   { opacity: 0;    transform: skewX(-15deg) translateX(-80%); }
          40%  { opacity: 0.18; }
          100% { opacity: 0;    transform: skewX(-15deg) translateX(220%); }
        }
        @keyframes tbPulse {
          0%, 100% { text-shadow: 0 0 16px currentColor, 0 0 40px currentColor; }
          50%       { text-shadow: 0 0 32px currentColor, 0 0 80px currentColor, 0 0 120px currentColor; }
        }
      `}</style>

      {/* Banner */}
      <div
        key={banner.key}
        className="relative w-[160vw] flex items-center overflow-hidden"
        style={{
          animation: "tbSlide 2.8s cubic-bezier(0.22,1,0.36,1) forwards",
          background: bg,
          borderTop: `2px solid ${accent}`,
          borderBottom: `2px solid ${accent}`,
          boxShadow: `0 0 60px ${accent}55, 0 0 120px ${accent}22, inset 0 0 80px rgba(0,0,0,0.5)`,
          padding: "20px 64px",
        }}
      >
        {/* Sweep highlight */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 50%, transparent 100%)",
            animation: "tbShine 0.7s ease-out 0.35s forwards",
            opacity: 0,
          }}
        />

        {/* Left — local player */}
        <div className="flex-1 text-left pl-8 min-w-0">
          <p
            className="text-[11px] uppercase tracking-[0.2em] font-semibold mb-0.5"
            style={{ color: isLocal ? "#fbbf24aa" : "#94a3b8aa" }}
          >
            Vous
          </p>
          <p
            className="text-xl font-bold truncate"
            style={{ color: isLocal ? "#fef3c7" : "#cbd5e1" }}
          >
            {banner.localName}
          </p>
        </div>

        {/* Center */}
        <div className="flex flex-col items-center gap-2 px-10 shrink-0">
          <span className="text-4xl drop-shadow-lg">
            {isLocal ? "⚔️" : "🎴"}
          </span>
          <span
            className="text-4xl font-black tracking-[0.12em] uppercase"
            style={{
              color: accentLight,
              animation: "tbPulse 1.2s ease-in-out 0.4s 2",
            }}
          >
            {isLocal ? "VOTRE TOUR" : "TOUR ADVERSE"}
          </span>
          <div
            className="flex items-center gap-3 text-xs font-semibold uppercase tracking-widest"
            style={{ color: `${accent}cc` }}
          >
            <span className="w-12 h-px" style={{ background: accent }} />
            VS
            <span className="w-12 h-px" style={{ background: accent }} />
          </div>
        </div>

        {/* Right — opponent */}
        <div className="flex-1 text-right pr-8 min-w-0">
          <p
            className="text-[11px] uppercase tracking-[0.2em] font-semibold mb-0.5"
            style={{ color: !isLocal ? "#fbbf24aa" : "#94a3b8aa" }}
          >
            Adversaire
          </p>
          <p
            className="text-xl font-bold truncate"
            style={{ color: !isLocal ? "#fef3c7" : "#cbd5e1" }}
          >
            {banner.opponentName}
          </p>
        </div>
      </div>
    </div>
  );
}
