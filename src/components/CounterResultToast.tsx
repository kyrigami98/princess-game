"use client";

import Image from "next/image";
import { useEffect } from "react";
import { CARD_IMAGES } from "@/lib/cardImages";

interface Props {
  counterCardName: string;
  counterCardEmoji: string;
  counterCardEffect: string;
  blockedEffectName: string;
  counterPlayerName: string;
  onDone: () => void;
}

export default function CounterResultToast({
  counterCardName,
  counterCardEmoji,
  counterCardEffect,
  blockedEffectName,
  counterPlayerName,
  onDone,
}: Props) {
  useEffect(() => {
    const t = setTimeout(onDone, 3500);
    return () => clearTimeout(t);
  }, [onDone]);

  const img = CARD_IMAGES[counterCardEffect] ?? CARD_IMAGES.default;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <style>{`
        @keyframes crtSlide {
          0%   { opacity: 0; transform: translateX(-50%) translateY(-12px); }
          12%  { opacity: 1; transform: translateX(-50%) translateY(0); }
          80%  { opacity: 1; transform: translateX(-50%) translateY(0); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-8px); }
        }
      `}</style>
      <div
        style={{
          animation: "crtSlide 3.5s ease forwards",
          left: "50%",
          position: "relative",
          background: "rgba(18,6,42,0.92)",
          backdropFilter: "blur(8px)",
          boxShadow:
            "0 0 0 1px rgba(139,92,246,0.35), 0 0 32px rgba(120,50,220,0.25), 0 8px 32px rgba(0,0,0,0.6)",
        }}
        className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-violet-500/40 min-w-64"
      >
        {/* Counter card image */}
        <div className="relative w-12 h-16 rounded-lg overflow-hidden shrink-0 border border-violet-400/30 shadow-lg shadow-violet-900/40">
          <Image
            src={img}
            alt={counterCardName}
            fill
            className="object-cover"
          />
        </div>

        {/* Text */}
        <div className="min-w-0">
          <p className="text-violet-300 font-bold text-sm leading-tight">
            {counterCardEmoji} Réaction&nbsp;!
          </p>
          <p className="text-white text-xs mt-1 leading-snug">
            <span className="font-semibold text-violet-200">
              {counterPlayerName}
            </span>{" "}
            a contré{" "}
            <span className="text-amber-300 font-semibold">
              « {blockedEffectName} »
            </span>
          </p>
          <p className="text-slate-400 text-[11px] mt-0.5">
            avec{" "}
            <span className="text-violet-300 font-medium">
              {counterCardName}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
