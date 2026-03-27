"use client";

import Image from "next/image";
import type { MagicCard, PendingCounter } from "@/lib/types";
import { CARD_IMAGES } from "@/lib/cardImages";

interface Props {
  pendingCounter: PendingCounter;
  counterCards: MagicCard[];
  onResolve: (counterCardId?: string) => void;
}

export default function CounterModal({
  pendingCounter,
  counterCards,
  onResolve,
}: Props) {
  const isBarrier = pendingCounter.kind === "barrier";
  const isMagic = pendingCounter.kind === "magic";
  const triggerEffect = isBarrier
    ? "life"
    : isMagic
      ? pendingCounter.pendingMagicCard.effect
      : pendingCounter.pendingGridCard.effect;
  const triggerLabel = isBarrier
    ? "Perte de vie"
    : isMagic
      ? pendingCounter.pendingMagicCard.name
      : pendingCounter.pendingGridCard.label;
  const triggerDesc = isBarrier
    ? "Vous êtes sur le point de perdre 1 vie."
    : isMagic
      ? pendingCounter.pendingMagicCard.description
      : pendingCounter.pendingGridCard.description;
  const triggerImage = CARD_IMAGES[triggerEffect] ?? CARD_IMAGES.default;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center pb-4 pointer-events-none">
      <div
        className="pointer-events-auto flex gap-5 items-stretch rounded-2xl border border-violet-500/50 p-5 shadow-2xl"
        style={{
          background: "rgba(10,6,28,0.82)",
          backdropFilter: "blur(6px)",
          boxShadow:
            "0 0 40px rgba(120,50,220,0.3), 0 8px 32px rgba(0,0,0,0.6)",
        }}
      >
        {/* ── Gauche : grande image de la carte déclenchante ── */}
        <div className="flex flex-col items-center gap-3 shrink-0 w-44">
          <div className="relative w-44 h-64 rounded-xl overflow-hidden border-2 border-violet-400/40 shadow-lg shadow-violet-900/40">
            <Image
              src={triggerImage}
              alt={triggerLabel ?? ""}
              fill
              className="object-cover"
            />
          </div>
          <div className="w-full text-center px-1">
            <p className="text-white font-bold text-xs leading-tight">
              {triggerLabel}
            </p>
            <p className="text-slate-400 text-[11px] mt-1 leading-snug">
              {triggerDesc}
            </p>
          </div>
        </div>

        {/* ── Droite : header + actions ── */}
        <div className="flex flex-col gap-3 w-72">
          <div className="mb-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xl">{isBarrier ? "🛡️" : "🌀"}</span>
              <span className="text-white font-bold text-base">
                {isBarrier ? "Barrière disponible" : "Réaction adverse"}
              </span>
            </div>
            <p className="text-slate-400 text-xs mt-1 leading-snug">
              {pendingCounter.description}
            </p>
          </div>

          {counterCards.map((card) => {
            const cardImg = CARD_IMAGES[card.effect] ?? CARD_IMAGES.default;
            return (
              <button
                key={card.id}
                onClick={() => onResolve(card.id)}
                className="flex items-center gap-3 w-full px-3 py-3 rounded-xl bg-violet-900/70 border border-violet-500/60 text-violet-200 hover:bg-violet-800/90 transition-colors"
              >
                <div className="relative shrink-0 w-12 h-16 rounded-lg overflow-hidden border border-violet-400/30">
                  <Image
                    src={cardImg}
                    alt={card.name ?? ""}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="text-left min-w-0">
                  <div className="font-bold text-sm">{card.name}</div>
                  <div className="text-[11px] text-violet-400 leading-snug mt-0.5">
                    {card.description}
                  </div>
                </div>
              </button>
            );
          })}

          <button
            onClick={() => onResolve(undefined)}
            className="w-full py-2.5 px-3 rounded-xl bg-slate-800/60 border border-white/10 text-slate-300 hover:bg-slate-700/80 hover:text-white transition-colors font-semibold text-sm mt-auto"
          >
            Laisser passer
          </button>
        </div>
      </div>
    </div>
  );
}
