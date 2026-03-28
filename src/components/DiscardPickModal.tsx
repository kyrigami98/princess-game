"use client";

import Image from "next/image";
import { useState } from "react";
import type { MagicCard } from "@/lib/types";
import { CARD_IMAGES } from "@/lib/cardImages";
import CardFace, { type CardData } from "./CardFace";
import CardPreview from "./CardPreview";

interface Props {
  hand: MagicCard[];
  onPickCard: (cardId: string) => void;
  onLoseLife?: () => void;
  title?: string;
  description?: string;
  triggerCardEffect?: string;
  triggerCardLabel?: string;
}

export default function DiscardPickModal({
  hand,
  onPickCard,
  onLoseLife,
  title,
  description,
  triggerCardEffect,
  triggerCardLabel,
}: Props) {
  const [hovered, setHovered] = useState<{ card: CardData; rect: DOMRect } | null>(null);

  const triggerImage = triggerCardEffect
    ? (CARD_IMAGES[triggerCardEffect] ?? CARD_IMAGES.default)
    : null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        <div
          className="relative flex gap-5 items-stretch rounded-2xl border border-white/10 p-5 shadow-2xl max-w-2xl w-full"
          style={{ background: "rgba(13,10,26,0.97)" }}
        >
          {/* Image déclencheuse */}
          {triggerImage && (
            <div className="flex flex-col items-center gap-2 shrink-0 w-56">
              <div className="relative w-56 h-84 rounded-xl overflow-hidden border-2 border-white/20 shadow-lg">
                <Image src={triggerImage} alt={triggerCardLabel ?? ""} fill className="object-cover" />
              </div>
              <p className="text-slate-400 text-xs text-center font-semibold leading-tight px-1">
                {triggerCardLabel}
              </p>
            </div>
          )}

          {/* Contenu */}
          <div className="flex flex-col gap-4 flex-1 min-w-0">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-0.5">Défausse requise</p>
              <h2 className="text-white font-bold text-base">{title ?? "Quelle carte défausser ?"}</h2>
              <p className="text-slate-400 text-xs mt-1">
                {description ?? (onLoseLife ? "Choisissez une carte à défausser, ou perdez 1 vie." : "Choisissez une carte.")}
              </p>
            </div>

            {hand.length === 0 ? (
              <p className="text-center text-slate-500 text-sm py-2">Aucune carte en main.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {hand.map((card) => {
                  const cardData: CardData = {
                    id: card.id,
                    effect: card.effect,
                    label: card.name,
                    description: card.description,
                    timing: card.timing,
                    isMagic: true,
                  };
                  return (
                    <button
                      key={card.id}
                      className="flex flex-col gap-1 group focus:outline-none"
                      onClick={() => onPickCard(card.id)}
                      onMouseEnter={(e) =>
                        setHovered({ card: cardData, rect: e.currentTarget.getBoundingClientRect() })
                      }
                      onMouseLeave={() => setHovered(null)}
                    >
                      <div
                        className="w-full rounded-lg overflow-hidden ring-2 ring-transparent group-hover:ring-rose-500/70 group-focus:ring-rose-400 transition-all shadow-lg"
                        style={{ aspectRatio: "2/3" }}
                      >
                        <CardFace card={cardData} size="sm" />
                      </div>
                      <span className="text-[10px] text-center text-slate-400 group-hover:text-rose-300 truncate leading-tight transition-colors">
                        {card.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {onLoseLife && (
              <button
                onClick={onLoseLife}
                className="w-full py-2.5 rounded-xl bg-red-900/50 border border-red-700/60 text-red-300 hover:bg-red-800/70 transition-colors font-semibold text-sm mt-auto"
              >
                Perdre 1 vie à la place
              </button>
            )}
          </div>
        </div>
      </div>

      {hovered && (
        <CardPreview card={hovered.card} anchorRect={hovered.rect} previewSize="xl" />
      )}
    </>
  );
}
