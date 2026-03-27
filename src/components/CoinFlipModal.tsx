"use client";

import { useEffect, useState } from "react";
import type { PlayerID } from "@/lib/types";

interface Props {
  victim: PlayerID;
  victimName: string;
  localRole: PlayerID;
  onDone: () => void;
}

export default function CoinFlipModal({
  victim,
  victimName,
  localRole,
  onDone,
}: Props) {
  const [phase, setPhase] = useState<"spinning" | "result">("spinning");
  const isLocalVictim = victim === localRole;

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("result"), 1800);
    const t2 = setTimeout(() => onDone(), 3800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm pointer-events-none">
      <style>{`
        @keyframes cfSpin {
          0%   { transform: rotateY(0deg) scale(1); }
          80%  { transform: rotateY(1440deg) scale(1); }
          90%  { transform: rotateY(1530deg) scale(1.12); }
          100% { transform: rotateY(1440deg) scale(1); }
        }
        @keyframes cfResult {
          from { opacity: 0; transform: translateY(12px) scale(0.85); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes cfShake {
          0%, 100% { transform: translateX(0); }
          20%  { transform: translateX(-6px); }
          40%  { transform: translateX(6px); }
          60%  { transform: translateX(-4px); }
          80%  { transform: translateX(4px); }
        }
      `}</style>

      {/* Card */}
      <div
        className="rounded-2xl px-10 py-8 text-center select-none"
        style={{
          background:
            "linear-gradient(160deg, rgba(20,14,40,0.97), rgba(12,8,28,0.98))",
          border: "1px solid rgba(180,130,50,0.35)",
          boxShadow:
            "0 0 0 1px rgba(99,51,180,0.2), 0 20px 60px rgba(0,0,0,0.7)",
          minWidth: "280px",
        }}
      >
        {/* Title */}
        <p className="text-amber-400/70 text-xs font-semibold tracking-widest uppercase mb-5">
          🗡️ Assassin — Pile ou Face
        </p>

        {/* Coin */}
        <div
          className="flex justify-center mb-6"
          style={{ perspective: "300px" }}
        >
          <div
            style={{
              width: "5rem",
              height: "5rem",
              borderRadius: "50%",
              background:
                "radial-gradient(circle at 38% 32%, #fef3c7, #f59e0b 55%, #92400e)",
              border: "3px solid #fbbf24",
              boxShadow:
                "0 0 24px rgba(251,191,36,0.55), inset 0 2px 5px rgba(255,255,255,0.25), inset 0 -2px 4px rgba(0,0,0,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.6rem",
              animation:
                phase === "spinning"
                  ? "cfSpin 1.8s cubic-bezier(0.4,0,0.2,1) forwards"
                  : undefined,
            }}
          >
            🗡️
          </div>
        </div>

        {/* Result */}
        {phase === "result" && (
          <div style={{ animation: "cfResult 0.35s ease-out forwards" }}>
            <p
              className={`text-4xl font-black mb-1 ${
                isLocalVictim ? "text-red-400" : "text-emerald-400"
              }`}
              style={{
                animation: isLocalVictim ? "cfShake 0.45s ease-out" : undefined,
                textShadow: isLocalVictim
                  ? "0 0 20px rgba(239,68,68,0.6)"
                  : "0 0 20px rgba(52,211,153,0.6)",
              }}
            >
              {isLocalVictim ? "😱 Malchance !" : "🍀 Chance !"}
            </p>
            <p className="text-slate-300 text-base mt-2">
              <span
                className={`font-bold ${
                  isLocalVictim ? "text-red-300" : "text-slate-200"
                }`}
              >
                {victimName}
              </span>{" "}
              perd <span className="text-red-400 font-bold">1 vie</span>.
            </p>
          </div>
        )}

        {phase === "spinning" && (
          <p className="text-slate-500 text-sm animate-pulse">
            La pièce tourne…
          </p>
        )}
      </div>
    </div>
  );
}
