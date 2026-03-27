'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import type { PlayerID } from '@/lib/types';
import MultiplayerLobby from './MultiplayerLobby';

const MultiGame = dynamic(() => import('./MultiGame'), { ssr: false });

type AppScreen =
  | { view: 'menu' }
  | { view: 'lobby' }
  | { view: 'multi'; gameCode: string; localRole: PlayerID; localPlayerId: string };

export default function ClientGame() {
  const [screen, setScreen] = useState<AppScreen>({ view: 'menu' });

  if (screen.view === 'lobby') {
    return (
      <MultiplayerLobby
        onJoinGame={(gameCode, localRole, localPlayerId) =>
          setScreen({ view: 'multi', gameCode, localRole, localPlayerId })
        }
        onBack={() => setScreen({ view: 'menu' })}
      />
    );
  }

  if (screen.view === 'multi') {
    return (
      <MultiGame
        gameCode={screen.gameCode}
        localRole={screen.localRole}
        localPlayerId={screen.localPlayerId}
        onBack={() => setScreen({ view: 'menu' })}
      />
    );
  }

  // Main menu
  return (
    <div className="min-h-screen game-bg flex items-center justify-center p-4">
      <div className="w-full max-w-xs text-center">
        <div className="text-6xl mb-4">👑</div>
        <h1 className="text-3xl font-bold text-white mb-1 tracking-tight">
          Le Jeu de la Princesse
        </h1>
        <p className="text-slate-400 text-sm mb-10">
          Magie, stratégie, et la mort vous attend.
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => setScreen({ view: 'lobby' })}
            className="w-full py-3.5 rounded-xl bg-violet-700 hover:bg-violet-600 text-white font-bold text-base transition-colors shadow-lg shadow-violet-900/30 border border-violet-500/30"
          >
            🌐 Jouer en multijoueur
          </button>
        </div>

        <p className="mt-8 text-slate-600 text-xs">
          ✦ Jeu pour 2 joueurs ✦
        </p>
      </div>
    </div>
  );
}
