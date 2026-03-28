"use client";

import Image from "next/image";
import type { MagicCard } from "@/lib/types";
import { CARD_IMAGES } from "@/lib/cardImages";

type ProtectionOption =
  | { kind: "flag"; flag: string; label: string; effect?: string; description?: string }
  | { kind: "barrier" };

interface Props {
  playerName: string;
  options: ProtectionOption[];
  barrierCard?: MagicCard;
  triggerCardEffect?: string;
  triggerCardLabel?: string;
  onChoose: (choice: { kind: "flag"; flag: string } | { kind: "barrier" } | { kind: "none" }) => void;
}

export default function ProtectionChoiceModal({
  playerName,
  options,
  barrierCard,
  triggerCardEffect,
  triggerCardLabel,
  onChoose,
}: Props) {
  const triggerImage = CARD_IMAGES[triggerCardEffect ?? ''] ?? CARD_IMAGES.default;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative flex gap-5 items-stretch rounded-2xl border border-amber-500/40 p-5 shadow-2xl max-w-2xl w-full"
        style={{
          background: "rgba(10,6,20,0.97)",
          boxShadow: "0 0 60px rgba(251,191,36,0.2), 0 8px 32px rgba(0,0,0,0.8)",
        }}
      >
        {/* ── Gauche : carte déclencheuse ── */}
        <div className="flex flex-col items-center gap-2 shrink-0 w-56">
          <div className="relative w-56 h-84 rounded-xl overflow-hidden border-2 border-amber-500/40 shadow-lg">
            <Image src={triggerImage} alt={triggerCardLabel ?? ""} fill className="object-cover" />
          </div>
          <p className="text-amber-300/70 text-xs text-center font-semibold leading-tight px-1">
            {triggerCardLabel}
          </p>
        </div>

        {/* ── Droite : choix ── */}
        <div className="flex flex-col gap-3 flex-1">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-xl">🛡️</span>
              <span className="text-white font-bold text-base">Protection disponible</span>
            </div>
            <p className="text-slate-400 text-xs leading-snug">
              <span className="text-amber-300 font-semibold">{playerName}</span> — annuler l&apos;effet ou le subir ?
            </p>
          </div>

          <div className="flex flex-col gap-2">
            {options.map((opt, i) => {
              if (opt.kind === "flag") {
                const img = CARD_IMAGES[opt.effect ?? ''] ?? CARD_IMAGES.default;
                return (
                  <button
                    key={i}
                    onClick={() => onChoose({ kind: "flag", flag: opt.flag })}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl bg-emerald-900/60 border border-emerald-600/50 text-emerald-200 hover:bg-emerald-800/80 transition-colors"
                  >
                    <div className="relative shrink-0 w-12 h-18 rounded-lg overflow-hidden border border-emerald-400/30">
                      <Image src={img} alt={opt.label} fill className="object-cover" />
                    </div>
                    <div className="text-left min-w-0">
                      <div className="font-bold text-sm text-emerald-300">Protection PERSONNAGE</div>
                      <div className="text-[11px] text-emerald-200 font-semibold leading-tight mt-0.5 truncate">{opt.label}</div>
                      {opt.description && (
                        <div className="text-[10px] text-emerald-300/60 leading-tight mt-0.5 line-clamp-2">{opt.description}</div>
                      )}
                    </div>
                  </button>
                );
              }
              if (opt.kind === "barrier" && barrierCard) {
                const img = CARD_IMAGES[barrierCard.effect] ?? CARD_IMAGES.default;
                return (
                  <button
                    key={i}
                    onClick={() => onChoose({ kind: "barrier" })}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl bg-indigo-900/60 border border-indigo-600/50 text-indigo-200 hover:bg-indigo-800/80 transition-colors"
                  >
                    <div className="relative shrink-0 w-10 h-14 rounded-lg overflow-hidden border border-indigo-400/30">
                      <Image src={img} alt={barrierCard.name} fill className="object-cover" />
                    </div>
                    <div className="text-left min-w-0">
                      <div className="font-bold text-sm text-indigo-300">Jouer {barrierCard.name}</div>
                      <div className="text-[11px] text-indigo-300/70 leading-tight mt-0.5">{barrierCard.description}</div>
                    </div>
                  </button>
                );
              }
              return null;
            })}

            <button
              onClick={() => onChoose({ kind: "none" })}
              className="w-full py-2.5 rounded-xl bg-red-900/40 border border-red-700/50 text-red-300 hover:bg-red-800/60 transition-colors font-semibold text-sm"
            >
              ❤️ Subir l&apos;effet
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
