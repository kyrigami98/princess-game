"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { PlayerID } from "@/lib/types";
import MultiplayerLobby from "./MultiplayerLobby";

const MultiGame = dynamic(() => import("./MultiGame"), { ssr: false });

const SESSION_KEY = "princess_session";

interface GameSession {
  gameCode: string;
  localRole: PlayerID;
  localPlayerId: string;
  playerName: string;
}

type AppScreen =
  | { view: "menu" }
  | { view: "lobby" }
  | ({ view: "multi" } & GameSession);

function saveSession(s: GameSession) {
  if (typeof window !== "undefined")
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
}

function clearSession() {
  if (typeof window !== "undefined") localStorage.removeItem(SESSION_KEY);
}

function loadSession(): GameSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as GameSession) : null;
  } catch {
    return null;
  }
}

export default function ClientGame() {
  const [screen, setScreen] = useState<AppScreen>({ view: "menu" });
  const [savedSession, setSavedSession] = useState<GameSession | null>(null);

  // Lecture de la session au premier rendu (client uniquement)
  useEffect(() => {
    const session = loadSession();
    if (session) {
      setSavedSession(session);
      setScreen({ view: "multi", ...session });
    }
  }, []);

  function handleJoinGame(
    gameCode: string,
    localRole: PlayerID,
    localPlayerId: string,
    playerName: string,
  ) {
    const session: GameSession = { gameCode, localRole, localPlayerId, playerName };
    saveSession(session);
    setScreen({ view: "multi", ...session });
  }

  function handleBack() {
    clearSession();
    setSavedSession(null);
    setScreen({ view: "menu" });
  }

  if (screen.view === "lobby") {
    return (
      <MultiplayerLobby
        onJoinGame={handleJoinGame}
        onBack={() => setScreen({ view: "menu" })}
      />
    );
  }

  if (screen.view === "multi") {
    return (
      <MultiGame
        gameCode={screen.gameCode}
        localRole={screen.localRole}
        localPlayerId={screen.localPlayerId}
        playerName={screen.playerName}
        onBack={handleBack}
      />
    );
  }

  // Menu principal
  return (
    <div className="min-h-screen game-bg flex items-center justify-center p-4">
      <div className="w-full max-w-xs text-center">
        <div className="text-6xl mb-4">&#x1F451;</div>
        <h1 className="text-3xl font-bold text-white mb-1 tracking-tight">
          Le Jeu de la Princesse
        </h1>
        <p className="text-slate-400 text-sm mb-10">
          Magie, strategie, et la mort vous attend.
        </p>

        <div className="flex flex-col gap-3">
          {savedSession && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3 mb-2">
              <p className="text-amber-300 text-xs font-semibold mb-2">
                Partie en cours - Code : {savedSession.gameCode}
              </p>
              <button
                onClick={() => setScreen({ view: "multi", ...savedSession })}
                className="w-full py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm transition-colors"
              >
                Reprendre la partie
              </button>
              <button
                onClick={handleBack}
                className="mt-1.5 w-full text-xs text-amber-500/70 hover:text-amber-400 transition-colors"
              >
                Abandonner
              </button>
            </div>
          )}

          <button
            onClick={() => setScreen({ view: "lobby" })}
            className="w-full py-3.5 rounded-xl bg-violet-700 hover:bg-violet-600 text-white font-bold text-base transition-colors shadow-lg shadow-violet-900/30 border border-violet-500/30"
          >
            Jouer en multijoueur
          </button>
        </div>

        <p className="mt-8 text-slate-600 text-xs">Jeu pour 2 joueurs</p>
      </div>
    </div>
  );
}