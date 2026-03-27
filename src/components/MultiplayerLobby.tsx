"use client";

import { useEffect, useRef, useState } from "react";
import type { PlayerID } from "@/lib/types";
import {
  supabase,
  generateGameCode,
  getOrCreatePlayerId,
  getOrCreatePlayerName,
  savePlayerName,
} from "@/lib/supabase";
import type { GameRow } from "@/lib/supabase";
import { createInitialState } from "@/lib/gameLogic";

interface Props {
  onJoinGame: (
    gameCode: string,
    localRole: PlayerID,
    localPlayerId: string,
    playerName: string,
  ) => void;
  onBack: () => void;
}

type Screen = "menu" | "waiting";

export default function MultiplayerLobby({ onJoinGame, onBack }: Props) {
  const [screen, setScreen] = useState<Screen>("menu");
  const [gameCode, setGameCode] = useState("");
  const [joinInput, setJoinInput] = useState("");
  const [username, setUsername] = useState(() => getOrCreatePlayerName());
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, []);

  function resolvedName(fallback: string): string {
    const trimmed = username.trim();
    return trimmed.length > 0 ? trimmed : fallback;
  }

  async function handleCreate() {
    setIsLoading(true);
    setError(null);

    const name = resolvedName("Joueur 1");
    savePlayerName(name);

    const playerId = getOrCreatePlayerId();
    const code = generateGameCode();
    const initialState = createInitialState(name);

    const { error: insertError } = await supabase.from("games").insert({
      code,
      state: initialState,
      player1_id: playerId,
      status: "waiting",
    });

    if (insertError) {
      setError("Impossible de creer la partie. Reessaie.");
      setIsLoading(false);
      return;
    }

    setGameCode(code);
    setScreen("waiting");
    setIsLoading(false);

    const channel = supabase
      .channel(`lobby-${code}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "games", filter: `code=eq.${code}` },
        (payload) => {
          const row = payload.new as GameRow;
          if (row.player2_id && row.status === "playing") {
            supabase.removeChannel(channel);
            onJoinGame(code, "player1", playerId, name);
          }
        },
      )
      .subscribe();

    channelRef.current = channel;
  }

  async function handleJoin() {
    const code = joinInput.trim().toUpperCase();
    if (code.length < 4) { setError("Code de partie invalide."); return; }

    setIsLoading(true);
    setError(null);

    const name = resolvedName("Joueur 2");
    savePlayerName(name);

    const playerId = getOrCreatePlayerId();

    const { data, error: fetchError } = await supabase
      .from("games").select("*").eq("code", code).eq("status", "waiting").single<GameRow>();

    if (fetchError || !data) {
      setError("Partie introuvable ou deja commencee.");
      setIsLoading(false);
      return;
    }

    if (data.player1_id === playerId) {
      setError("Tu ne peux pas rejoindre ta propre partie.");
      setIsLoading(false);
      return;
    }

    const updatedState = {
      ...data.state,
      players: {
        ...data.state.players,
        player2: { ...data.state.players.player2, name },
      },
    };

    const { error: updateError } = await supabase
      .from("games")
      .update({ player2_id: playerId, status: "playing", state: updatedState })
      .eq("code", code);

    if (updateError) {
      setError("Impossible de rejoindre la partie.");
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
    onJoinGame(code, "player2", playerId, name);
  }

  return (
    <div className="min-h-screen game-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <button
          onClick={onBack}
          className="mb-6 flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors"
        >
          Retour
        </button>

        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 shadow-2xl">
          {screen === "menu" && (
            <>
              <h2 className="text-xl font-bold text-white mb-1">Multijoueur</h2>
              <p className="text-slate-400 text-sm mb-5">Joue contre un ami en temps reel.</p>

              <div className="mb-5">
                <label className="block text-[11px] text-slate-400 uppercase tracking-wider font-semibold mb-1.5">
                  Ton nom
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  maxLength={20}
                  placeholder="Joueur mystere"
                  className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50 transition-colors text-sm"
                />
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleCreate}
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold transition-colors shadow shadow-amber-900/40"
                >
                  Creer une partie
                </button>

                <div className="flex items-center gap-3 text-slate-600 text-xs">
                  <div className="flex-1 h-px bg-white/10" />
                  ou
                  <div className="flex-1 h-px bg-white/10" />
                </div>

                <div className="flex flex-col gap-2">
                  <input
                    type="text"
                    value={joinInput}
                    onChange={(e) => setJoinInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                    maxLength={4}
                    placeholder="CODE"
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-600 font-mono text-center text-lg tracking-widest focus:outline-none focus:border-violet-500/60 transition-colors"
                  />
                  <button
                    onClick={handleJoin}
                    disabled={isLoading || joinInput.trim().length < 4}
                    className="w-full py-2.5 rounded-xl bg-violet-700 hover:bg-violet-600 disabled:opacity-40 text-white font-bold transition-colors"
                  >
                    Rejoindre
                  </button>
                </div>
              </div>

              {error && (
                <p className="mt-3 text-rose-400 text-sm text-center">{error}</p>
              )}
            </>
          )}

          {screen === "waiting" && (
            <div className="text-center py-4">
              <div className="text-4xl mb-4">&#x23F3;</div>
              <h2 className="text-lg font-bold text-white mb-2">En attente d&apos;un adversaire...</h2>
              <p className="text-slate-400 text-sm mb-6">Partage ce code a ton ami :</p>
              <div className="inline-block px-6 py-3 rounded-xl bg-white/5 border border-amber-500/30 font-mono text-3xl font-bold text-amber-400 tracking-widest mb-4">
                {gameCode}
              </div>
              <p className="text-slate-500 text-xs">La partie demarrera automatiquement.</p>
              <button
                onClick={() => {
                  if (channelRef.current) supabase.removeChannel(channelRef.current);
                  setScreen("menu");
                  setGameCode("");
                }}
                className="mt-4 text-sm text-slate-500 hover:text-slate-300 transition-colors"
              >
                Annuler
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}