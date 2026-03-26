"use client";

interface Props {
  type: "goblin" | "choice_of_soul" | "discard_any_card";
  hasMagicCard: boolean;
  onChoose: (
    choice: "lose_life" | "discard_magic" | "draw_magic" | "gain_life",
  ) => void;
}

export default function ChoiceModal({ type, hasMagicCard, onChoose }: Props) {
  const isDiscardChoice = type === "goblin" || type === "discard_any_card";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-80 shadow-2xl">
        {isDiscardChoice && (
          <>
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">
                {type === "goblin" ? "👺" : "⚔️"}
              </div>
              <h2 className="text-white font-bold text-lg">
                {type === "goblin" ? "Le Gobelin !" : "Défausse requise"}
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                Choisissez une option :
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => onChoose("lose_life")}
                className="w-full py-3 px-4 rounded-xl bg-red-900/60 border border-red-700 text-red-200 hover:bg-red-800/80 transition-colors font-semibold text-sm"
              >
                ❤️ Perdre 1 vie
              </button>
              <button
                onClick={() =>
                  onChoose(hasMagicCard ? "discard_magic" : "lose_life")
                }
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
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">✨</div>
              <h2 className="text-white font-bold text-lg">Choix d’âme</h2>
              <p className="text-slate-400 text-sm mt-1">
                Choisissez votre bénéfice :
              </p>
            </div>
            <div className="flex flex-col gap-3">
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
  );
}
