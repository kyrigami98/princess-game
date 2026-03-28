"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { MagicCard } from "@/lib/types";
import CardFace, { type CardData } from "./CardFace";
import CardPreview from "./CardPreview";

interface Props {
  label: string;
  cards: MagicCard[];
  onClose: () => void;
}

export default function DiscardModal({ label, cards, onClose }: Props) {
  const [hoveredCard, setHoveredCard] = useState<{
    card: CardData;
    rect: DOMRect;
  } | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return (
    <>
      {createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

          {/* Modal */}
          <div
            className="relative z-10 w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border border-white/10 bg-[#0d0a1a]/95 shadow-2xl shadow-black/80"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-lg">🗂️</span>
                <span className="font-semibold text-white">{label}</span>
                <span className="text-xs rounded-full bg-white/10 border border-white/15 px-2 py-0.5 text-slate-300 font-bold">
                  {cards.length} carte{cards.length !== 1 ? "s" : ""}
                </span>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors text-lg"
              >
                ✕
              </button>
            </div>

            {/* Cards grid */}
            <div className="overflow-y-auto p-4">
              {cards.length === 0 ? (
                <p className="text-center text-slate-500 py-8">
                  La défausse est vide.
                </p>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                  {[...cards].reverse().map((card, i) => {
                    const cardData: CardData = {
                      id: card.id,
                      effect: card.effect,
                      label: card.name,
                      description: card.description,
                      timing: card.timing,
                      isMagic: true,
                    };
                    return (
                      <div
                        key={`${card.id}-${i}`}
                        className="flex flex-col gap-1"
                        onMouseEnter={(e) =>
                          setHoveredCard({
                            card: cardData,
                            rect: e.currentTarget.getBoundingClientRect(),
                          })
                        }
                        onMouseLeave={() => setHoveredCard(null)}
                      >
                        <div
                          className="w-full rounded-lg overflow-hidden shadow-lg cursor-default"
                          style={{ aspectRatio: "2 / 3" }}
                        >
                          <CardFace card={cardData} size="sm" />
                        </div>
                        <span className="text-[9px] text-center text-slate-400 truncate leading-tight">
                          {card.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}
      {hoveredCard && (
        <CardPreview
          card={hoveredCard.card}
          anchorRect={hoveredCard.rect}
          previewSize="xl"
          preferredSide="left"
        />
      )}
    </>
  );
}
