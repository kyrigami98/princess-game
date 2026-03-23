'use client';

interface Props {
  type: 'goblin' | 'coup_decisif';
  onGoblinChoose?: (choice: 'lose_life' | 'discard_magic') => void;
  onCoupDecisifChoose?: (choice: 'draw_magic' | 'gain_life') => void;
  hasMagicCard: boolean; // whether player has a card to discard (goblin)
}

export default function ChoiceModal({ type, onGoblinChoose, onCoupDecisifChoose, hasMagicCard }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-80 shadow-2xl">
        {type === 'goblin' && (
          <>
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">👺</div>
              <h2 className="text-white font-bold text-lg">Le Gobelin !</h2>
              <p className="text-slate-400 text-sm mt-1">
                Choisissez votre punition :
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => onGoblinChoose?.('lose_life')}
                className="w-full py-3 px-4 rounded-xl bg-red-900/60 border border-red-700 text-red-200 hover:bg-red-800/80 transition-colors font-semibold text-sm"
              >
                ❤️ Perdre 1 vie
              </button>
              <button
                onClick={() => onGoblinChoose?.(hasMagicCard ? 'discard_magic' : 'lose_life')}
                disabled={!hasMagicCard}
                className={[
                  'w-full py-3 px-4 rounded-xl border font-semibold text-sm transition-colors',
                  hasMagicCard
                    ? 'bg-indigo-900/60 border-indigo-700 text-indigo-200 hover:bg-indigo-800/80'
                    : 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed',
                ].join(' ')}
              >
                🃏 Défausser 1 carte {!hasMagicCard && '(aucune)'}
              </button>
            </div>
          </>
        )}

        {type === 'coup_decisif' && (
          <>
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">⚔️</div>
              <h2 className="text-white font-bold text-lg">Coup Décisif !</h2>
              <p className="text-slate-400 text-sm mt-1">
                Choisissez votre récompense :
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => onCoupDecisifChoose?.('gain_life')}
                className="w-full py-3 px-4 rounded-xl bg-emerald-900/60 border border-emerald-700 text-emerald-200 hover:bg-emerald-800/80 transition-colors font-semibold text-sm"
              >
                ❤️ Gagner 1 vie
              </button>
              <button
                onClick={() => onCoupDecisifChoose?.('draw_magic')}
                className="w-full py-3 px-4 rounded-xl bg-indigo-900/60 border border-indigo-700 text-indigo-200 hover:bg-indigo-800/80 transition-colors font-semibold text-sm"
              >
                🃏 Piocher 1 carte de magie
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
