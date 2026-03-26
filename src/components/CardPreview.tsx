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
}

export default function CardPreview({
  card,
  anchorRect,
  showBack = false,
  previewSize = "md",
}: Props) {
  const isSmallScreen =
    typeof window !== "undefined" && window.innerWidth < 640;
  const W =
    previewSize === "xl"
      ? isSmallScreen
        ? 180
        : 280
      : isSmallScreen
        ? 150
        : 200;
  const H =
    previewSize === "xl"
      ? isSmallScreen
        ? 270
        : 420
      : isSmallScreen
        ? 225
        : 300;
  const MARGIN = 12;
  const ref = useRef<HTMLDivElement>(null);

  // Position: prefer above the card, centered horizontally
  let left = anchorRect.left + anchorRect.width / 2 - W / 2;
  let top = anchorRect.top - H - MARGIN;

  // Clamp to viewport
  if (typeof window !== "undefined") {
    if (isSmallScreen) {
      left = Math.max(MARGIN, Math.min(left, window.innerWidth - W - MARGIN));
      top = Math.max(MARGIN, Math.min(top, window.innerHeight - H - MARGIN));
    }
    if (left < MARGIN) left = MARGIN;
    if (left + W > window.innerWidth - MARGIN)
      left = window.innerWidth - W - MARGIN;
    if (top < MARGIN) top = anchorRect.bottom + MARGIN; // show below instead
    if (top + H > window.innerHeight - MARGIN)
      top = window.innerHeight - H - MARGIN;
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={ref}
      className="fixed z-50 pointer-events-none"
      style={{ left, top, width: W }}
    >
      <div className="flex flex-col shadow-2xl shadow-black/80 rounded-lg ring-2 ring-white/20 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
        <div style={{ height: H }} className="w-full">
          {showBack ? <CardBack /> : <CardFace card={card} size="lg" />}
        </div>
        {!showBack && (
          <div className="bg-slate-950 px-2 py-1.5 flex flex-col gap-0.5">
            <span className="font-bold text-white text-xs leading-tight truncate">
              {card.label}
            </span>
            {card.description && (
              <span className="text-slate-300 text-[10px] leading-snug line-clamp-3">
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
