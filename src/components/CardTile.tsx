"use client";

import { useEffect, useRef, useState } from "react";
import type { GridCard, Position, PlayerID } from "../lib/types";
import CardFace, { type CardData } from "./CardFace";
import CardBack from "./CardBack";
import CardPreview from "./CardPreview";

interface Props {
  card: GridCard;
  viewerID: PlayerID;
  isSelectable: boolean;
  isArrowTarget: boolean;
  isPeekTarget: boolean;
  isManipulationTarget: boolean;
  isLastFlipped: boolean;
  onClick: (pos: Position) => void;
  onHover?: (card: CardData | null) => void;
  marker?: PlayerID | null;
}

export default function CardTile({
  card,
  viewerID,
  isSelectable,
  isArrowTarget,
  isPeekTarget,
  isManipulationTarget,
  isLastFlipped,
  onClick,
  onHover,
  marker,
}: Props) {
  const [hoverRect, setHoverRect] = useState<DOMRect | null>(null);
  const [isTouchHover, setIsTouchHover] = useState(false);

  // ── Flip animation ────────────────────────────────────────────────────────
  const [flipPhase, setFlipPhase] = useState<'idle' | 'out' | 'in'>('idle');
  const [displayAsFlipped, setDisplayAsFlipped] = useState(card.flipped);
  const prevFlippedRef = useRef(card.flipped);

  useEffect(() => {
    if (card.flipped && !prevFlippedRef.current) {
      prevFlippedRef.current = true;
      setFlipPhase('out');
      const t1 = setTimeout(() => {
        setDisplayAsFlipped(true);
        setFlipPhase('in');
      }, 180);
      const t2 = setTimeout(() => setFlipPhase('idle'), 500);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [card.flipped]);

  const canSee = displayAsFlipped || (card.peeked && card.peekedBy === viewerID);
  const clickable =
    isSelectable || isArrowTarget || isPeekTarget || isManipulationTarget;

  let ringClass = "";
  if (isArrowTarget || isPeekTarget)
    ringClass = "ring-4 ring-orange-400 ring-offset-1 animate-pulse";
  else if (isManipulationTarget)
    ringClass = "ring-4 ring-violet-400 ring-offset-1 animate-pulse";
  else if (isSelectable) ringClass = "hover:ring-2 ring-white/50";

  const cardData = {
    id: card.id,
    effect: card.effect,
    label: card.label,
    description: card.description,
    arrows: card.arrows,
    isMagic: false,
  };

  return (
    <>
      <button
        data-card-pos={`${card.position.row}-${card.position.col}`}
        onClick={() => clickable && onClick(card.position)}
        onMouseEnter={(e) => {
          setHoverRect(e.currentTarget.getBoundingClientRect());
          setIsTouchHover(false);
          if (canSee) onHover?.(cardData);
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
          "relative w-full rounded-lg transition-all duration-200",
          clickable
            ? "cursor-pointer hover:scale-105 hover:z-10"
            : "cursor-default",
          card.flipped ? "opacity-60" : "",
          ringClass,
          isLastFlipped && card.flipped ? "card-last-flipped" : "",
        ].join(" ")}
        style={{ aspectRatio: "2 / 3" }}
      >
        <div className={[
          "absolute inset-0 rounded-lg overflow-hidden",
          flipPhase === 'out' ? 'card-flip-out' : flipPhase === 'in' ? 'card-flip-in' : '',
        ].join(' ')}>
          {canSee ? (
            <CardFace card={cardData} size="sm" />
          ) : (
            <CardBack
              peekedByOther={card.peeked && card.peekedBy !== viewerID}
            />
          )}
        </div>
        {marker && (
          <div
            className={[
              "absolute top-1 right-1 w-3 h-3 rounded-full border-2 shadow-lg z-20",
              "animate-pulse",
              marker === "player1"
                ? "bg-rose-500 border-rose-200 shadow-rose-500/60"
                : "bg-blue-500 border-blue-200 shadow-blue-500/60",
            ].join(" ")}
          />
        )}
      </button>

      {hoverRect && canSee && (isTouchHover || !onHover) && (
        <CardPreview
          card={cardData}
          anchorRect={hoverRect}
          showBack={false}
          previewSize="xl"
          preferredSide="right"
        />
      )}
    </>
  );
}
