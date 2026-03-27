'use client';

import type { PlayerID } from '@/lib/types';

interface Props {
  winner: PlayerID;
  onRestart?: () => void;
}

export default function GameOverScreen({ winner, onRestart }: Props) {
  const isHumanWinner = winner === 'human';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border-2 border-amber-500 rounded-2xl p-8 sm:p-12 text-center max-w-sm mx-4 shadow-2xl">
        <div className="text-6xl mb-4">
          {isHumanWinner ? '👑' : '🤖'}
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">
          {isHumanWinner ? 'Victoire !' : 'Défaite...'}
        </h2>
        <p className="text-slate-400 mb-6">
          {isHumanWinner
            ? "Vous avez triomphé de l'IA. La Princesse est saine et sauve !"
            : "L'IA a remporté la partie. La mort a eu raison de vous..."}
        </p>
        {onRestart && (
          <button
            onClick={onRestart}
            className="px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-lg transition-colors shadow-lg"
          >
            Rejouer
          </button>
        )}
      </div>
    </div>
  );
}
