'use client';

import { useEffect, useRef } from 'react';
import CardFace, { type CardData } from './CardFace';

interface Props {
  card: CardData;
  anchorRect: DOMRect;
}

export default function CardPreview({ card, anchorRect }: Props) {
  const W = 160;
  const H = 240;
  const MARGIN = 12;
  const ref = useRef<HTMLDivElement>(null);

  // Position: prefer above the card, centered horizontally
  let left = anchorRect.left + anchorRect.width / 2 - W / 2;
  let top  = anchorRect.top - H - MARGIN;

  // Clamp to viewport
  if (typeof window !== 'undefined') {
    if (left < MARGIN) left = MARGIN;
    if (left + W > window.innerWidth - MARGIN) left = window.innerWidth - W - MARGIN;
    if (top < MARGIN) top = anchorRect.bottom + MARGIN; // show below instead
  }

  return (
    <div
      ref={ref}
      className="fixed z-50 pointer-events-none"
      style={{ left, top, width: W, height: H }}
    >
      <div className="w-full h-full shadow-2xl shadow-black/80 rounded-lg ring-2 ring-white/20 scale-100 animate-in fade-in zoom-in-95 duration-150">
        <CardFace card={card} size="lg" />
      </div>
    </div>
  );
}
