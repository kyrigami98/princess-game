'use client';

import type { Player, PlayerID } from '@/lib/types';

interface Props {
  player: Player;
  isActive: boolean;
  isAI?: boolean;
}

export default function PlayerPanel({ player, isActive, isAI }: Props) {
  const MAX_LIVES = 5;

  return (
    <div
      className={[
        'rounded-xl border-2 p-3 sm:p-4 transition-all duration-300',
        isActive
          ? 'border-amber-400 bg-amber-950/40 shadow-lg shadow-amber-500/20'
          : 'border-slate-700 bg-slate-900/40',
      ].join(' ')}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{isAI ? '🤖' : '👑'}</span>
        <div>
          <h3 className="font-bold text-white text-sm sm:text-base leading-tight">
            {player.name}
          </h3>
          <p className="text-xs text-slate-400 leading-tight">
            {isActive ? '⚡ Tour actif' : 'En attente'}
          </p>
        </div>
      </div>

      {/* Lives */}
      <div className="flex gap-1 mb-3">
        {Array.from({ length: MAX_LIVES }).map((_, i) => (
          <span key={i} className={`text-lg transition-all ${i < player.lives ? '' : 'opacity-20 grayscale'}`}>
            ❤️
          </span>
        ))}
      </div>

      {/* Status badges */}
      <div className="flex flex-wrap gap-1">
        {player.shielded && (
          <span className="text-xs bg-blue-800 text-blue-200 rounded-full px-2 py-0.5">🛡️ Bouclier</span>
        )}
        {player.cursed && (
          <span className="text-xs bg-violet-800 text-violet-200 rounded-full px-2 py-0.5">🌑 Maudit</span>
        )}
        {player.counterMagicActive && (
          <span className="text-xs bg-cyan-800 text-cyan-200 rounded-full px-2 py-0.5">🌀 Contre Magie</span>
        )}
        {player.nullifyNext && (
          <span className="text-xs bg-yellow-800 text-yellow-200 rounded-full px-2 py-0.5">✴️ Annulation</span>
        )}
      </div>

      {/* Hand count for AI */}
      {isAI && (
        <div className="mt-2 text-xs text-slate-400">
          🃏 {player.hand.length} carte{player.hand.length !== 1 ? 's' : ''} en main
        </div>
      )}
    </div>
  );
}
