"use client";

import Image from "next/image";
import { CARD_IMAGES } from "@/lib/cardImages";

interface Props {
  type: "goblin" | "choice_of_soul" | "discard_any_card";
  hasMagicCard: boolean;
  triggerCardEffect?: string;
  triggerCardLabel?: string;
  onChoose: (
    choice: "lose_life" | "discard_magic" | "draw_magic" | "gain_life",
  ) => void;
}

export default function ChoiceModal({ type, hasMagicCard, triggerCardEffect, triggerCardLabel, onChoose }: Props) {
  const isDiscardChoice = type === "goblin" || type === "discard_any_card";
  const triggerImage = triggerCardEffect
    ? (CARD_IMAGES[triggerCardEffect] ?? CARD_IMAGES.default)
    : null;

  return (
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
        <div className="flex flex-col gap-3 flex-1 justify-center">
          {isDiscardChoice && (
            <>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">{type === "goblin" ? "👺" : "⚔️"}</span>
                  <h2 className="text-white font-bold text-base">
                    {type === "goblin" ? "Le Gobelin !" : "Défausse requise"}
                  </h2>
                </div>
                <p className="text-slate-400 text-xs">Choisissez une option :</p>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => onChoose("lose_life")}
                  className="w-full py-3 px-4 rounded-xl bg-red-900/60 border border-red-700 text-red-200 hover:bg-red-800/80 transition-colors font-semibold text-sm"
                >
                  ❤️ Perdre 1 vie
                </button>
                <button
                  onClick={() => onChoose(hasMagicCard ? "discard_magic" : "lose_life")}
                  disabled={!hasMagicCard}
                  className={[
                    "w-full py-3 px-4 rounded-xl border font-semibold text-sm transition-colors",
                    hasMagicCard
                      ? "bg-indigo-900/60 border-indigo-700 text-indigo-200 hover:bg-indigo-800/80"
                      : "bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed",
                  ].join(" ")}
                >
                  🃏 Défausser 1 carte de magie {!hasMagicCard && "(aucune)"}
                </button>
              </div>
            </>
          )}

          {type === "choice_of_soul" && (
            <>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">✨</span>
                  <h2 className="text-white font-bold text-base">Choix d&apos;âme</h2>
                </div>
                <p className="text-slate-400 text-xs">Choisissez votre bénéfice :</p>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => onChoose("gain_life")}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-900/60 border border-emerald-700 text-emerald-200 hover:bg-emerald-800/80 transition-colors font-semibold text-sm"
                >
                  ❤️ Piocher 1 carte de VIE
                </button>
                <button
                  onClick={() => onChoose("draw_magic")}
                  className="w-full py-3 px-4 rounded-xl bg-indigo-900/60 border border-indigo-700 text-indigo-200 hover:bg-indigo-800/80 transition-colors font-semibold text-sm"
                >
                  🃏 Piocher 1 carte de MAGIE
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
