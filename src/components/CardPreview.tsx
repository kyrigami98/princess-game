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
  preferredSide?: "top" | "right";
}

export default function CardPreview({
  card,
  anchorRect: _anchorRect,
  showBack = false,
  previewSize = "md",
  preferredSide: _preferredSide = "top",
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const W = previewSize === "xl" ? 420 : 280;
  const H = previewSize === "xl" ? 630 : 420;

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={ref}
      className="fixed z-50 pointer-events-none"
      style={{
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
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
