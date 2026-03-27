"use client";

import type { PlayerID } from "@/lib/types";
import { useMultiplayer } from "@/hooks/useMultiplayer";
import Game from "./Game";
import { useGameState } from "@/hooks/useGameState";

interface Props {
  gameCode: string;
  localRole: PlayerID;
  localPlayerId: string;
  onBack: () => void;
}

export default function MultiGame({
  gameCode,
  localRole,
  localPlayerId,
  onBack,
}: Props) {
  const {
    state: remoteState,
    isOpponentConnected,
    pushState,
    error,
  } = useMultiplayer(gameCode, localRole, localPlayerId);

  if (error) {
    return (
      <div className="min-h-screen game-bg flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-rose-400 text-lg mb-4">{error}</p>
          <button
            onClick={onBack}
            className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold transition-colors"
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  if (!remoteState) {
    return (
      <div className="min-h-screen game-bg flex items-center justify-center">
        <div className="text-slate-400 text-sm animate-pulse">
          Chargement de la partie…
        </div>
      </div>
    );
  }

  return (
    <Game
      multiplayerProps={{
        gameCode,
        localRole,
        localPlayerId,
        pushState,
        isOpponentConnected,
      }}
      initialState={remoteState}
      externalState={remoteState}
    />
  );
}
