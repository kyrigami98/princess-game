"use client";

import { useState } from "react";
import type { GridCard, Position, PlayerID } from "../lib/types";
import CardFace from "./CardFace";
import CardBack from "./CardBack";
import CardPreview from "./CardPreview";

interface Props {
  card: GridCard;
  viewerID: PlayerID;
  isSelectable: boolean;
  isArrowTarget: boolean;
  isPeekTarget: boolean;
  isManipulationTarget: boolean;
  onClick: (pos: Position) => void;
}

export default function CardTile({
  card,
  viewerID,
  isSelectable,
  isArrowTarget,
  isPeekTarget,
  isManipulationTarget,
  onClick,
}: Props) {
  const [hoverRect, setHoverRect] = useState<DOMRect | null>(null);
  const canSee = card.flipped || (card.peeked && card.peekedBy === viewerID);
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
        onClick={() => clickable && onClick(card.position)}
        onMouseEnter={(e) => {
          setHoverRect(e.currentTarget.getBoundingClientRect());
        }}
        onTouchStart={(e) => {
          setHoverRect(e.currentTarget.getBoundingClientRect());
          setTimeout(() => setHoverRect(null), 900);
        }}
        onMouseLeave={() => setHoverRect(null)}
        className={[
          "relative w-full rounded-lg transition-all duration-200",
          clickable
            ? "cursor-pointer hover:scale-105 hover:z-10"
            : "cursor-default",
          card.flipped ? "opacity-60" : "",
          ringClass,
        ].join(" ")}
        style={{ aspectRatio: "2 / 3" }}
      >
        <div className="absolute inset-0 rounded-lg overflow-hidden">
          {canSee ? (
            <CardFace card={cardData} size="sm" />
          ) : (
            <CardBack
              peekedByOther={card.peeked && card.peekedBy !== viewerID}
            />
          )}
        </div>
      </button>

      {hoverRect && canSee && (
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
