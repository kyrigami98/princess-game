"use client";

import { useState } from "react";
import type { MagicCard } from "@/lib/types";
import CardFace, { type CardData } from "./CardFace";
import CardBack from "./CardBack";
import CardPreview from "./CardPreview";

interface Props {
  label: string;
  cards: MagicCard[];
  compact?: boolean;
  strip?: boolean;
}

export default function DiscardZone({
  label,
  cards,
  compact = false,
  strip = false,
}: Props) {
  const topCard = cards.length > 0 ? cards[cards.length - 1] : null;
  const [hoverRect, setHoverRect] = useState<DOMRect | null>(null);

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

  if (strip) {
    return (
      <div
        className="flex flex-col items-center gap-0.5 shrink-0"
        onMouseEnter={(e) =>
          cardData && setHoverRect(e.currentTarget.getBoundingClientRect())
        }
        onMouseLeave={() => setHoverRect(null)}
      >
        <span className="text-[8px] text-slate-500 uppercase tracking-wider font-semibold">
          {label}
        </span>
        <div className="flex items-center gap-1 rounded-lg border border-slate-700/70 bg-slate-900/70 px-1.5 py-1">
          <span className="text-sm leading-none">🗑️</span>
          <span className="text-xs font-bold rounded px-1 bg-slate-800/90 border border-slate-600 text-slate-200">
            {cards.length}
          </span>
        </div>
        {hoverRect && cardData && (
          <CardPreview
            card={cardData}
            anchorRect={hoverRect}
            previewSize="xl"
          />
        )}
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border border-slate-700/70 bg-slate-900/70 ${compact ? "p-2" : "p-3"}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
          {label}
        </span>
        <span className="text-[11px] rounded-md border border-slate-600 px-2 py-0.5 font-bold text-slate-200 bg-slate-800/90">
          {cards.length}
        </span>
      </div>

      <div
        className={compact ? "w-10 h-14" : "w-14 h-20"}
        onMouseEnter={(e) =>
          setHoverRect(e.currentTarget.getBoundingClientRect())
        }
        onMouseLeave={() => setHoverRect(null)}
        onTouchStart={(e) => {
          setHoverRect(e.currentTarget.getBoundingClientRect());
          setTimeout(() => setHoverRect(null), 900);
        }}
      >
        {cardData ? <CardFace card={cardData} size="sm" /> : <CardBack />}
      </div>

      {hoverRect && cardData && (
        <CardPreview card={cardData} anchorRect={hoverRect} previewSize="xl" />
      )}
    </div>
  );
}
