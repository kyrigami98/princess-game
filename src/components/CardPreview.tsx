"use client";

import { useRef } from "react";
import { createPortal } from "react-dom";
import CardFace, { type CardData } from "./CardFace";
import CardBack from "./CardBack";

interface Props {
  card: CardData;
  anchorRect: DOMRect;
  showBack?: boolean;
  previewSize?: "md" | "xl";
  preferredSide?: "top" | "right" | "left" | "auto";
}

export default function CardPreview({
  card,
  anchorRect,
  showBack = false,
  previewSize = "md",
  preferredSide = "auto",
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const W = previewSize === "xl" ? 420 : 280;
  const H = previewSize === "xl" ? 630 : 420;

  if (typeof document === "undefined") return null;

  const GAP = 12;
  const vpW = window.innerWidth;
  const vpH = window.innerHeight;

  // Vertical: vertically centered on the anchor, clamped to viewport
  let top = anchorRect.top + anchorRect.height / 2 - H / 2;
  top = Math.max(8, Math.min(top, vpH - H - 8));

  // Horizontal: choose side based on preferredSide or available space
  const spaceLeft = anchorRect.left - GAP;
  const spaceRight = vpW - anchorRect.right - GAP;
  let left: number;

  if (preferredSide === "left" || (preferredSide === "auto" && spaceLeft >= W)) {
    left = anchorRect.left - W - GAP;
  } else if (preferredSide === "right" || spaceRight >= W) {
    left = anchorRect.right + GAP;
  } else {
    // fallback: whichever side has more room
    left = spaceLeft >= spaceRight ? anchorRect.left - W - GAP : anchorRect.right + GAP;
  }
  left = Math.max(8, Math.min(left, vpW - W - 8));

  return createPortal(
    <div
      ref={ref}
      className="fixed z-50 pointer-events-none"
      style={{
        left,
        top,
        width: W,
      }}
    >
      <div className="flex flex-col shadow-2xl shadow-black/80 rounded-xl ring-2 ring-white/20 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
        <div style={{ height: H }} className="w-full">
          {showBack ? <CardBack /> : <CardFace card={card} size="lg" />}
        </div>
        {!showBack && (
          <div className="bg-slate-950 px-3 py-2 flex flex-col gap-1">
            <span className="font-bold text-white text-sm leading-tight truncate">
              {card.label}
            </span>
            {card.description && (
              <span className="text-slate-300 text-xs leading-snug line-clamp-4">
                {card.description}
              </span>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
