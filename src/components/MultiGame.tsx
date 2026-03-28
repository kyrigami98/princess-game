"use client";

import type { PlayerID } from "@/lib/types";
import { useMultiplayer } from "@/hooks/useMultiplayer";
import Game from "./Game";

interface Props {
  gameCode: string;
  localRole: PlayerID;
  localPlayerId: string;
  playerName: string;
  onBack: () => void;
}

export default function MultiGame({
  gameCode,
  localRole,
  localPlayerId,
  playerName,
  onBack,
}: Props) {
  const {
    state: remoteState,
    isOpponentConnected,
    pushState,
    fatalError,
    networkWarning,
  } = useMultiplayer(gameCode, localRole, localPlayerId);

  if (fatalError) {
    return (
      <div className="min-h-screen game-bg flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-rose-400 text-lg mb-4">{fatalError}</p>
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
    <>
      {/* Non-fatal network warning toast — game stays alive */}
      {networkWarning && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-60 flex items-center gap-2 px-4 py-2 rounded-xl border border-amber-500/40 bg-amber-950/90 text-amber-300 text-xs font-semibold shadow-xl backdrop-blur-sm pointer-events-none">
          <span className="animate-pulse">⚠</span>
          {networkWarning}
        </div>
      )}
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
        onBack={onBack}
      />
    </>
  );
}
