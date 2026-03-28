"use client";

import { useState } from "react";
import type { MagicCard, GamePhase, MagicTiming } from "@/lib/types";
import CardFace, { type CardData } from "./CardFace";
import CardPreview from "./CardPreview";

interface Props {
  hand: MagicCard[];
  phase: GamePhase;
  selectedCard: MagicCard | null;
  onSelect: (card: MagicCard | null) => void;
  disabled: boolean;
  onCardHover?: (card: CardData | null) => void;
}

function canPlayTiming(timing: MagicTiming, phase: GamePhase): boolean {
  if (phase === "play_magic_before") return timing === "before";
  if (phase === "play_magic_after") return timing === "after";
  return false;
}

function MagicCardButton({
  card,
  playable,
  isSelected,
  onSelect,
  onHover,
}: {
  card: MagicCard;
  playable: boolean;
  isSelected: boolean;
  onSelect: (c: MagicCard | null) => void;
  onHover?: (data: CardData | null) => void;
}) {
  const [hoverRect, setHoverRect] = useState<DOMRect | null>(null);
  const [isTouchHover, setIsTouchHover] = useState(false);

  const cardData: CardData = {
    id: card.id,
    effect: card.effect,
    label: card.name,
    description: card.description,
    timing: card.timing,
    isMagic: true,
  };

  return (
    <>
      <button
        onClick={() => playable && onSelect(isSelected ? null : card)}
        onMouseEnter={(e) => {
          setHoverRect(e.currentTarget.getBoundingClientRect());
          setIsTouchHover(false);
          onHover?.(cardData);
        }}
        onTouchStart={(e) => {
          setHoverRect(e.currentTarget.getBoundingClientRect());
          setIsTouchHover(true);
          setTimeout(() => setHoverRect(null), 900);
        }}
        onMouseLeave={() => {
          setHoverRect(null);
          onHover?.(null);
        }}
        className={[
          "relative flex-none transition-all duration-200",
          "w-24 h-36",
          isSelected ? "-translate-y-14 scale-110 z-20" : "",
          playable && !isSelected
            ? "hover:-translate-y-10 hover:z-10 cursor-pointer"
            : "",
          !playable ? "cursor-not-allowed grayscale" : "",
        ].join(" ")}
      >
        {/* Selection glow */}
        {isSelected && (
          <div className="absolute inset-0 rounded-lg ring-2 ring-amber-400 shadow-lg shadow-amber-500/50 z-10" />
        )}
        <CardFace card={cardData} size="sm" />
      </button>

      {hoverRect && (isTouchHover || !onHover) && (
        <CardPreview card={cardData} anchorRect={hoverRect} previewSize="xl" />
      )}
    </>
  );
}

export default function MagicHand({
  hand,
  phase,
  selectedCard,
  onSelect,
  disabled,
  onCardHover,
}: Props) {
  if (hand.length === 0) {
    return null;
  }

  // Fan: slight rotation for each card (only visible if > 3 cards)
  const totalCards = hand.length;
  const maxAngle = Math.min(totalCards * 1.5, 8); // max ±8°

  return (
    <div className="flex items-end justify-center w-full overflow-visible px-4 pointer-events-none">
      <div className="md:hidden w-full overflow-x-auto pointer-events-auto">
        <div className="flex items-end gap-2 min-w-max px-2 snap-x snap-mandatory">
          {hand.map((card) => {
            const playable = !disabled && canPlayTiming(card.timing, phase);
            const isSelected = selectedCard?.id === card.id;
            return (
              <div key={card.id} className="snap-start pb-1">
                <MagicCardButton
                  card={card}
                  playable={playable}
                  isSelected={isSelected}
                  onSelect={onSelect}
                  onHover={onCardHover}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div
        className="hidden md:flex relative items-end justify-center pointer-events-auto"
        style={{ gap: "-4px" }}
      >
        {hand.map((card, i) => {
          const playable = !disabled && canPlayTiming(card.timing, phase);
          const isSelected = selectedCard?.id === card.id;

          // Fan rotation: spread from center
          const angle =
            totalCards > 1
              ? ((i - (totalCards - 1) / 2) / ((totalCards - 1) / 2 || 1)) *
                maxAngle
              : 0;
          const translateY =
            totalCards > 1 ? Math.abs(angle / maxAngle) * 6 : 0;

          return (
            <div
              key={card.id}
              style={{
                transform: isSelected
                  ? "none"
                  : `rotate(${angle}deg) translateY(${translateY}px)`,
                marginLeft: i > 0 ? "-8px" : 0,
                zIndex: isSelected ? 20 : i,
                transformOrigin: "bottom center",
              }}
            >
              <MagicCardButton
                card={card}
                playable={playable}
                isSelected={isSelected}
                onSelect={onSelect}
                onHover={onCardHover}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
