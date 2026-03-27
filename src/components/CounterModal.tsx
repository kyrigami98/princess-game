"use client";

import type { MagicCard } from "@/lib/types";

interface Props {
  /** Description de l'effet entrant (ex : "Joueur 1 joue Manipulation.") */
  description: string;
  /** Cartes Contre-magie disponibles dans la main du joueur */
  counterCards: MagicCard[];
  /** Appelé avec l'id de la carte jouée, ou undefined pour passer */
  onResolve: (counterCardId?: string) => void;
}

export default function CounterModal({
  description,
  counterCards,
  onResolve,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
      <div
        className="w-80 rounded-2xl border border-violet-500/40 bg-[#0d0a1e]/95 p-6 shadow-2xl"
        style={{ boxShadow: "0 0 60px rgba(120,50,220,0.25)" }}
      >
        {/* Header */}
        <div className="text-center mb-5">
          <div className="text-4xl mb-2">🌀</div>
          <h2 className="text-white font-bold text-lg leading-tight">
            Réaction adverse
          </h2>
          <p className="text-slate-400 text-sm mt-2 leading-snug">
            {description}
          </p>
        </div>

        {/* Options */}
        <div className="flex flex-col gap-3">
          {counterCards.map((card) => (
            <button
              key={card.id}
              onClick={() => onResolve(card.id)}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-violet-900/60 border border-violet-500/50 text-violet-200 hover:bg-violet-800/80 transition-colors font-semibold text-sm"
            >
              <span className="text-xl">{card.emoji}</span>
              <div className="text-left">
                <div>{card.name}</div>
                <div className="text-[10px] text-violet-400 font-normal">
                  {card.description}
                </div>
              </div>
            </button>
          ))}

          <button
            onClick={() => onResolve(undefined)}
            className="w-full py-3 px-4 rounded-xl bg-slate-800/80 border border-white/10 text-slate-300 hover:bg-slate-700/80 hover:text-white transition-colors font-semibold text-sm"
          >
            Laisser passer
          </button>
        </div>
      </div>
    </div>
  );
}
