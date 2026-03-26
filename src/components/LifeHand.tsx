"use client";

import { useMemo, useState } from "react";
import CardFace, { type CardData } from "./CardFace";
import CardPreview from "./CardPreview";

interface Props {
  count: number;
  mirrored?: boolean;
  compact?: boolean;
}

function buildLifeCard(index: number): CardData {
  return {
    id: `life-${index}`,
    effect: "life",
    label: "Carte de Vie",
    description: "Représente 1 point de vie du joueur.",
    isMagic: false,
  };
}

export default function LifeHand({
  count,
  mirrored = false,
  compact = false,
}: Props) {
  const cards = useMemo(
    () => Array.from({ length: count }, (_, i) => buildLifeCard(i)),
    [count],
  );
  const [hoverInfo, setHoverInfo] = useState<{
    card: CardData;
    rect: DOMRect;
  } | null>(null);

  return (
    <div
      className={`flex ${mirrored ? "justify-end" : "justify-start"} items-center gap-1.5 overflow-hidden`}
    >
      {cards.map((card, index) => (
        <button
          key={card.id}
          type="button"
          onMouseEnter={(e) =>
            setHoverInfo({
              card,
              rect: e.currentTarget.getBoundingClientRect(),
            })
          }
          onMouseLeave={() => setHoverInfo(null)}
          onTouchStart={(e) => {
            setHoverInfo({
              card,
              rect: e.currentTarget.getBoundingClientRect(),
            });
            setTimeout(() => setHoverInfo(null), 900);
          }}
          className={`${compact ? "w-8 h-11" : "w-10 h-14"} ${index > 0 ? "-ml-2" : ""} transition-transform hover:-translate-y-1`}
          style={{ zIndex: mirrored ? cards.length - index : index }}
        >
          <CardFace card={card} size="sm" />
        </button>
      ))}

      {hoverInfo && (
        <CardPreview
          card={hoverInfo.card}
          anchorRect={hoverInfo.rect}
          previewSize="xl"
        />
      )}
    </div>
  );
}
