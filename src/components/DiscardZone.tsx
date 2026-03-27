"use client";

import { useState } from "react";
import type { MagicCard } from "@/lib/types";
import CardFace, { type CardData } from "./CardFace";
import DiscardModal from "./DiscardModal";

interface Props {
  label: string;
  cards: MagicCard[];
}

export default function DiscardZone({ label, cards }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const topCard = cards.length > 0 ? cards[cards.length - 1] : null;

  const cardData: CardData | null = topCard
    ? {
        id: topCard.id,
        effect: topCard.effect,
        label: topCard.name,
        description: topCard.description,
        timing: topCard.timing,
        isMagic: true,
      }
    : null;

  return (
    <>
      <button
        className="flex flex-col items-center gap-1 shrink-0 group cursor-pointer disabled:cursor-default"
        onClick={() => cards.length > 0 && setModalOpen(true)}
        disabled={cards.length === 0}
        title={cards.length > 0 ? `Voir la défausse (${cards.length})` : undefined}
      >
        <span className="text-[8px] text-slate-500 uppercase tracking-wider font-semibold group-hover:text-slate-300 transition-colors">
          {label}
        </span>

        {/* Pile visuelle */}
        <div className="relative w-9 h-13">
          {/* Layers de fond (effet pile) */}
          <div className="absolute inset-0 rounded-md border border-slate-600/50 bg-slate-800/60 translate-x-1 translate-y-1" />
          <div className="absolute inset-0 rounded-md border border-slate-600/70 bg-slate-800/75 translate-x-0.5 translate-y-0.5" />

          {/* Top card */}
          <div className="absolute inset-0 rounded-md overflow-hidden border border-slate-500/60 shadow-lg group-hover:brightness-110 transition-all">
            {cardData ? (
              <CardFace card={cardData} size="sm" />
            ) : (
              <div className="w-full h-full bg-slate-800/80 flex items-center justify-center">
                <span className="text-slate-600 text-lg">🗑️</span>
              </div>
            )}
          </div>

          {/* Count badge */}
          {cards.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 z-10 min-w-4 h-4 flex items-center justify-center rounded-full bg-slate-700 border border-slate-500 text-[9px] font-bold text-slate-200 px-1">
              {cards.length}
            </span>
          )}
        </div>
      </button>

      {modalOpen && (
        <DiscardModal
          label={label}
          cards={cards}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}
