"use client";

import { useState } from "react";
import type { MagicCard } from "@/lib/types";
import CardFace, { type CardData } from "./CardFace";
import CardPreview from "./CardPreview";

interface Props {
  hand: MagicCard[];
  onPickCard: (cardId: string) => void;
  onLoseLife: () => void;
}

export default function DiscardPickModal({ hand, onPickCard, onLoseLife }: Props) {
  const [hovered, setHovered] = useState<{ card: CardData; rect: DOMRect } | null>(null);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
        <div className="relative w-full max-w-md mx-4 rounded-2xl border border-white/10 bg-[#0d0a1a]/95 shadow-2xl flex flex-col gap-4 p-5">
          <div className="text-center">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-0.5">Défausse requise</p>
            <h2 className="text-white font-bold text-lg">Quelle carte défausser ?</h2>
            <p className="text-slate-400 text-sm mt-1">
              Choisissez une carte à défausser, ou perdez 1 vie.
            </p>
          </div>

          {hand.length === 0 ? (
            <p className="text-center text-slate-500 text-sm py-2">Aucune carte en main.</p>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {hand.map((card) => {
                const cardData: CardData = {
                  id: card.id,
                  effect: card.effect,
                  label: card.name,
                  description: card.description,
                  timing: card.timing,
                  isMagic: true,
                };
                return (
                  <button
                    key={card.id}
                    className="flex flex-col gap-1 group focus:outline-none"
                    onClick={() => onPickCard(card.id)}
                    onMouseEnter={(e) =>
                      setHovered({ card: cardData, rect: e.currentTarget.getBoundingClientRect() })
                    }
                    onMouseLeave={() => setHovered(null)}
                  >
                    <div className="w-full rounded-lg overflow-hidden ring-2 ring-transparent group-hover:ring-rose-500/70 group-focus:ring-rose-400 transition-all shadow-lg"
                      style={{ aspectRatio: "2/3" }}>
                      <CardFace card={cardData} size="sm" />
                    </div>
                    <span className="text-[10px] text-center text-slate-400 group-hover:text-rose-300 truncate leading-tight transition-colors">
                      {card.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          <button
            onClick={onLoseLife}
            className="w-full py-2.5 rounded-xl bg-red-900/50 border border-red-700/60 text-red-300 hover:bg-red-800/70 transition-colors font-semibold text-sm"
          >
            Perdre 1 vie à la place
          </button>
        </div>
      </div>

      {hovered && (
        <CardPreview card={hovered.card} anchorRect={hovered.rect} previewSize="xl" />
      )}
    </>
  );
}
