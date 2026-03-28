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

function MiniGridPreview({ rows, cols }: { rows: number; cols: number }) {
  const cellW = Math.min(44, Math.floor(220 / cols));
  const cellH = Math.floor(cellW * 1.45);
  return (
    <div className="flex flex-col gap-1.5 items-center">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-1.5">
          {Array.from({ length: cols }).map((_, c) => (
            <div
              key={c}
              className="rounded-md border border-white/10 bg-linear-to-b from-slate-800 to-slate-900 shadow-sm"
              style={{ width: cellW, height: cellH }}
            />
          ))}
        </div>
      ))}
      <p className="text-[11px] text-slate-500 mt-2 tabular-nums">
        {rows}×{cols} = {rows * cols} cartes
      </p>
    </div>
  );
}

export default function MultiplayerLobby({ onJoinGame, onBack }: Props) {
  const [screen, setScreen] = useState<Screen>("menu");
  const [gameCode, setGameCode] = useState("");
  const [joinInput, setJoinInput] = useState("");
  const [username, setUsername] = useState(() => getOrCreatePlayerName());
  const [gridRows, setGridRows] = useState(4);
  const [gridCols, setGridCols] = useState(6);
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
    const initialState = createInitialState(
      name,
      "Joueur 2",
      gridRows,
      gridCols,
    );

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
        {
          event: "UPDATE",
          schema: "public",
          table: "games",
          filter: `code=eq.${code}`,
        },
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
    if (code.length < 4) {
      setError("Code de partie invalide.");
      return;
    }

    setIsLoading(true);
    setError(null);

    const name = resolvedName("Joueur 2");
    savePlayerName(name);

    const playerId = getOrCreatePlayerId();

    const { data, error: fetchError } = await supabase
      .from("games")
      .select("*")
      .eq("code", code)
      .eq("status", "waiting")
      .single<GameRow>();

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
      <div className="w-full max-w-4xl">
        <button
          onClick={onBack}
          className="mb-6 flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors"
        >
          Retour
        </button>

        {screen === "menu" && (
          <div className="max-w-2xl mx-auto">
            {/* ── Left: form ── */}
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Multijoueur</h2>
                <p className="text-slate-400 text-sm">Joue contre un ami en temps réel.</p>
              </div>

              {/* Nom partagé */}
              <div>
                <label className="block text-[11px] text-slate-400 uppercase tracking-wider font-semibold mb-1.5">
                  Ton nom
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  maxLength={20}
                  placeholder="Joueur mystère"
                  className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50 transition-colors text-sm"
                />
              </div>

              {/* Deux blocs côte à côte */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                {/* ── Bloc créer ── */}
                <div className="rounded-2xl border border-amber-500/20 bg-amber-950/10 backdrop-blur-sm p-5 flex flex-col gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-white mb-0.5">Créer une partie</h3>
                    <p className="text-[11px] text-slate-500">Tu choisis la taille du terrain.</p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                      Grille ({gridRows}×{gridCols})
                    </label>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400 w-14 shrink-0">Lignes : {gridRows}</span>
                      <input type="range" min={2} max={7} value={gridRows}
                        onChange={(e) => setGridRows(Number(e.target.value))}
                        className="flex-1 accent-amber-500" />
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-400 w-14 shrink-0">Colonnes : {gridCols}</span>
                      <input type="range" min={2} max={7} value={gridCols}
                        onChange={(e) => setGridCols(Number(e.target.value))}
                        className="flex-1 accent-amber-500" />
                    </div>
                  </div>

                  <div className="flex justify-center py-1">
                    <MiniGridPreview rows={gridRows} cols={gridCols} />
                  </div>

                  <button
                    onClick={handleCreate}
                    disabled={isLoading}
                    className="mt-auto w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold transition-colors shadow shadow-amber-900/40"
                  >
                    Créer
                  </button>
                </div>

                {/* ── Bloc rejoindre ── */}
                <div className="rounded-2xl border border-violet-500/20 bg-violet-950/10 backdrop-blur-sm p-5 flex flex-col gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-white mb-0.5">Rejoindre une partie</h3>
                    <p className="text-[11px] text-slate-500">Entre le code partagé par ton ami.</p>
                  </div>

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
                    className="mt-auto w-full py-2.5 rounded-xl bg-violet-700 hover:bg-violet-600 disabled:opacity-40 text-white font-bold transition-colors"
                  >
                    Rejoindre
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-rose-400 text-sm text-center">{error}</p>
              )}

              {/* ── Règles en accordéon ── */}
              <details className="group border-t border-white/8 pt-4">
                  <summary className="cursor-pointer list-none flex items-center justify-between text-[11px] text-slate-400 uppercase tracking-wider font-semibold hover:text-white transition-colors select-none">
                    Rappel des règles
                    <span className="text-slate-600 group-open:rotate-180 transition-transform duration-200">▾</span>
                  </summary>
                  <div className="mt-3 flex flex-col gap-2 text-xs text-slate-400 border-t border-white/8 pt-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-amber-400 font-semibold">Personnages</span>
                      <span className="leading-snug">Révélés sur le terrain, leurs effets s&apos;appliquent immédiatement.</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-violet-400 font-semibold">Sorts</span>
                      <span className="leading-snug">Cartes neutres avec effets spéciaux (régénération, boule de feu…).</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-rose-400 font-semibold">LA MORT</span>
                      <span className="leading-snug">Révéler cette carte = défaite immédiate.</span>
                    </div>
                    <div className="border-t border-white/8 pt-2 flex flex-col gap-2">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-indigo-400 font-semibold">Magie</span>
                        <span className="leading-snug">Jouée depuis la main, avant ou après avoir retourné une carte.</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-emerald-400 font-semibold">Barrière</span>
                        <span className="leading-snug">Annule une perte de 1 vie (réaction).</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-cyan-400 font-semibold">Contre-magie</span>
                        <span className="leading-snug">Annule un sort de magie adverse (réaction).</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-yellow-400 font-semibold">Immunité</span>
                        <span className="leading-snug">Annule un effet de personnage adverse (réaction).</span>
                      </div>
                    </div>
                  </div>
              </details>
            </div>

          </div>
        )}

        {screen === "waiting" && (
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 shadow-2xl max-w-sm mx-auto">
            <div className="text-center py-4">
              <div className="text-4xl mb-4">&#x23F3;</div>
              <h2 className="text-lg font-bold text-white mb-2">
                En attente d&apos;un adversaire...
              </h2>
              <p className="text-slate-400 text-sm mb-6">
                Partage ce code a ton ami :
              </p>
              <div className="inline-block px-6 py-3 rounded-xl bg-white/5 border border-amber-500/30 font-mono text-3xl font-bold text-amber-400 tracking-widest mb-4">
                {gameCode}
              </div>
              <p className="text-slate-500 text-xs">
                La partie demarrera automatiquement.
              </p>
              <button
                onClick={() => {
                  if (channelRef.current)
                    supabase.removeChannel(channelRef.current);
                  setScreen("menu");
                  setGameCode("");
                }}
                className="mt-4 text-sm text-slate-500 hover:text-slate-300 transition-colors"
              >
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
