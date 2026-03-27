"use client";

import { useCallback, useMemo, useState } from "react";
import type { MagicCard, Player, PlayerID, Position } from "@/lib/types";
import { useGameState } from "@/hooks/useGameState";
import GameBoard from "@/components/GameBoard";
import MagicHand from "@/components/MagicHand";
import GameLog from "@/components/GameLog";
import PhaseIndicator from "@/components/PhaseIndicator";
import GameOverScreen from "@/components/GameOverScreen";
import ChoiceModal from "@/components/ChoiceModal";
import DeckZone from "@/components/DeckZone";
import DiscardZone from "@/components/DiscardZone";
import CardBack from "@/components/CardBack";

// ─── AI hand (face-down fanned cards) ────────────────────────────────────────

function AiHand({ count }: { count: number }) {
  const total = Math.max(count, 1);
  return (
    <div className="flex items-end justify-center px-2 h-full">
      {Array.from({ length: total }).map((_, index) => {
        const angle =
          total > 1
            ? ((index - (total - 1) / 2) / ((total - 1) / 2 || 1)) * 6
            : 0;
        const lift = total > 1 ? Math.abs(index - (total - 1) / 2) * 2 : 0;
        return (
          <div
            key={index}
            className="w-8 h-12 shrink-0"
            style={{
              zIndex: total - index,
              marginLeft: index > 0 ? "-8px" : 0,
              transform: `rotate(${angle}deg) translateY(${lift}px)`,
              transformOrigin: "bottom center",
            }}
          >
            <CardBack />
          </div>
        );
      })}
    </div>
  );
}

// ─── Life dice ───────────────────────────────────────────────────────────────

const DICE_DOTS: Record<number, boolean[]> = {
  0: [false, false, false, false, false, false, false, false, false],
  1: [false, false, false, false, true, false, false, false, false],
  2: [false, false, true, false, false, false, true, false, false],
  3: [false, false, true, false, true, false, true, false, false],
  4: [true, false, true, false, false, false, true, false, true],
  5: [true, false, true, false, true, false, true, false, true],
  6: [true, false, true, true, false, true, true, false, true],
};

function Die({ value }: { value: number }) {
  const dots = DICE_DOTS[value] ?? DICE_DOTS[6];
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="w-9 h-9 rounded-lg bg-linear-to-br from-rose-950 to-red-900 border-2 border-rose-700/80 shadow-inner shadow-black/40 grid grid-cols-3 grid-rows-3 p-1.5 gap-0.5">
        {dots.map((on, i) => (
          <div
            key={i}
            className={`rounded-full ${on ? "bg-rose-300 shadow-sm shadow-rose-400/80" : ""}`}
          />
        ))}
      </div>
      <span className="text-[9px] font-bold text-rose-400 tabular-nums">
        {value}
      </span>
    </div>
  );
}

function LifeDice({ lives }: { lives: number }) {
  const first = Math.min(lives, 6);
  const second = lives > 6 ? Math.min(lives - 6, 6) : null;
  return (
    <div className="flex flex-col items-center gap-0.5 shrink-0">
      <span className="text-[8px] text-slate-500 uppercase tracking-wider font-semibold">
        Vies
      </span>
      <div className="flex gap-1">
        {second !== null && <Die value={second} />}
        <Die value={first} />
      </div>
    </div>
  );
}

// ─── Player strip ─────────────────────────────────────────────────────────────

function PlayerStrip({
  player,
  isActive,
  isAI,
  discardLabel,
  magicDeckCount,
  mirrored,
  children,
}: {
  player: Player;
  isActive: boolean;
  isAI?: boolean;
  discardLabel: string;
  magicDeckCount: number;
  mirrored?: boolean;
  children: React.ReactNode;
}) {
  const statusBadge = (
    <div
      className={[
        "flex flex-col items-center justify-center gap-1 px-2 py-1.5 rounded-xl border shrink-0 min-w-12",
        isActive
          ? "border-amber-500/50 bg-amber-950/30 shadow shadow-amber-500/20"
          : "border-white/5 bg-white/3",
      ].join(" ")}
    >
      <span className="text-base leading-none">{isAI ? "🤖" : "👑"}</span>
      <span className="text-[9px] font-bold text-white leading-none truncate max-w-10">
        {player.name}
      </span>
      <div className="flex flex-wrap gap-0.5 justify-center">
        {player.immuneNextSingleLifeLoss && (
          <span className="text-[10px]">🛡️</span>
        )}
        {player.counterMagicActive && <span className="text-[10px]">🌀</span>}
        {player.immuneCharacterEffect && (
          <span className="text-[10px]">✴️</span>
        )}
        {player.immuneNextMagic && <span className="text-[10px]">🔰</span>}
        {player.skipNextTurn && <span className="text-[10px]">⏩</span>}
        {isActive && (
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        )}
      </div>
    </div>
  );

  const sideInfo = (
    <div className="flex items-center gap-2 shrink-0">
      <LifeDice lives={player.lives} />
      <DiscardZone label={discardLabel} cards={player.discardPile} />
      <DeckZone label="Magie" count={magicDeckCount} icon="🃏" tone="indigo" />
    </div>
  );

  return (
    <section
      className={[
        "flex items-center gap-2 px-3 py-2 rounded-2xl border overflow-hidden transition-all duration-300",
        isActive
          ? "border-amber-500/25 bg-white/5 shadow-lg shadow-amber-500/5"
          : "border-white/5 bg-white/3",
      ].join(" ")}
      style={{ backdropFilter: "blur(8px)" }}
    >
      {mirrored ? (
        <>
          {sideInfo}
          <div className="flex-1 min-w-0 min-h-0 self-stretch">{children}</div>
          {statusBadge}
        </>
      ) : (
        <>
          {statusBadge}
          <div className="flex-1 min-w-0 min-h-0 self-stretch">{children}</div>
          {sideInfo}
        </>
      )}
    </section>
  );
}

// ─── Main game component ──────────────────────────────────────────────────────

export interface MultiplayerProps {
  gameCode: string;
  localRole: PlayerID;
  localPlayerId: string;
  pushState: (state: import("@/lib/types").GameState) => Promise<void>;
  isOpponentConnected: boolean;
}

interface GameProps {
  multiplayerProps?: MultiplayerProps;
  /** Seed state for the reducer (first load from Supabase) */
  initialState?: import("@/lib/types").GameState;
  /** Latest remote state from Supabase realtime — synced on every opponent move */
  externalState?: import("@/lib/types").GameState | null;
}

export default function Game({
  multiplayerProps,
  initialState,
  externalState,
}: GameProps = {}) {
  const localRole = multiplayerProps?.localRole ?? "human";

  const { state, actions } = useGameState({
    initialState,
    externalState,
    onStateChange: multiplayerProps?.pushState,
  });

  const [showLog, setShowLog] = useState(false);

  const pendingChoice = state.pendingChoice;
  const isLocalTurn = state.currentTurn === localRole;

  const isLocalPending = useMemo(
    () => pendingChoice?.playerId === localRole,
    [pendingChoice, localRole],
  );

  const handleCardClick = useCallback(
    (pos: Position) => {
      if (!isLocalTurn) return;
      if (pendingChoice?.type === "fairy_peek" && isLocalPending) {
        actions.fairyPeek(pos);
        return;
      }
      if (pendingChoice?.type === "manipulation" && isLocalPending) {
        actions.manipulationTarget(pos);
        return;
      }
      actions.flipCard(pos);
    },
    [actions, pendingChoice, isLocalPending, isLocalTurn],
  );

  const handleMagicSelect = useCallback(
    (card: MagicCard | null) => {
      if (!card) {
        actions.selectMagicCard(null);
        return;
      }
      actions.playMagic(card);
      actions.selectMagicCard(null);
    },
    [actions],
  );

  const flippedCount = state.grid.flat().filter((c) => c.flipped).length;
  const totalCards = state.grid.flat().length;
  const progressPct = (flippedCount / totalCards) * 100;

  const disableHand =
    state.phase === "game_over" ||
    !isLocalTurn ||
    !!(pendingChoice && isLocalPending);

  return (
    <div className="h-screen game-bg text-white overflow-hidden flex flex-col">
      <main className="flex-1 min-h-0 grid grid-rows-[auto_minmax(0,1fr)_auto] gap-1.5 p-1.5 overflow-hidden">
        {/* ── AI strip ─────────────────────────────────────────────────── */}
        <PlayerStrip
          player={state.players.ai}
          isActive={state.currentTurn === "ai"}
          isAI
          discardLabel="Défausse IA"
          magicDeckCount={state.magicDeck.length}
          mirrored
        >
          <AiHand count={state.players.ai.hand.length} />
        </PlayerStrip>

        {/* ── Board ────────────────────────────────────────────────────── */}
        <section
          className="relative min-h-0 rounded-2xl flex flex-col overflow-hidden"
          style={{
            background:
              "linear-gradient(to bottom, rgba(13,10,26,0.92), rgba(9,8,18,0.95))",
            boxShadow:
              "0 0 0 1px rgba(180,130,50,0.25), 0 0 0 3px rgba(99,51,180,0.18), 0 0 60px rgba(80,40,160,0.12), inset 0 0 80px rgba(60,20,120,0.08)",
          }}
        >
          {/* Corner ornaments */}
          <span className="absolute top-2 left-2.5 text-amber-500/25 text-base select-none pointer-events-none z-10">
            ✦
          </span>
          <span className="absolute top-2 right-2.5 text-amber-500/25 text-base select-none pointer-events-none z-10">
            ✦
          </span>
          <span className="absolute bottom-2 left-2.5 text-amber-500/25 text-base select-none pointer-events-none z-10">
            ✦
          </span>
          <span className="absolute bottom-2 right-2.5 text-amber-500/25 text-base select-none pointer-events-none z-10">
            ✦
          </span>

          {/* Inner radial glow */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 rounded-full bg-violet-900/12 blur-3xl" />
          </div>

          {/* Progress line */}
          <div
            className="absolute top-0 left-0 h-0.5 bg-linear-to-r from-amber-600/60 via-violet-500/60 to-amber-600/60 transition-all duration-500 rounded-t-2xl"
            style={{ width: `${progressPct}%` }}
          />

          {/* Board header */}
          <div className="relative z-10 flex items-center gap-2 px-4 pt-3 pb-1 shrink-0">
            <PhaseIndicator
              phase={state.phase}
              currentTurn={state.currentTurn}
              aiThinking={state.aiThinking}
              arrowActive={
                !!state.arrowConstraint || !!state.queenForcedQueue?.length
              }
              forcedFlip={!!state.forcedFlipTargets?.length}
              selectedMagicName={state.selectedMagicCard?.name ?? null}
              pendingChoice={pendingChoice?.type ?? null}
              onSkipBefore={actions.skipMagicBefore}
              onSkipAfter={actions.skipMagicAfter}
            />
            <div className="ml-auto flex items-center gap-1.5">
              <span className="text-[10px] text-slate-500 tabular-nums">
                {flippedCount}/{totalCards}
              </span>
              <button
                onClick={() => setShowLog((v) => !v)}
                className={`text-xs px-2 py-0.5 rounded-lg border transition-colors ${
                  showLog
                    ? "border-violet-500/60 text-violet-300 bg-violet-950/40"
                    : "border-white/10 text-slate-500 hover:text-white hover:border-white/20"
                }`}
              >
                📜
              </button>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${
                  multiplayerProps?.isOpponentConnected
                    ? "border-emerald-500/40 bg-emerald-950/30 text-emerald-400"
                    : "border-amber-500/40 bg-amber-950/30 text-amber-400"
                }`}
              >
                {multiplayerProps?.isOpponentConnected
                  ? "● Connecté"
                  : "◌ En attente…"}
              </span>
            </div>
          </div>

          {/* Grid */}
          <div className="relative z-10 flex-1 min-h-0 flex items-center justify-center p-2 overflow-hidden">
            <div className="h-full max-h-full aspect-square w-auto max-w-full">
              <GameBoard
                state={state}
                onCardClick={handleCardClick}
                viewerID={localRole}
              />
            </div>
          </div>
        </section>

        {/* ── Human strip ──────────────────────────────────────────────── */}
        <PlayerStrip
          player={state.players[localRole]}
          isActive={isLocalTurn}
          discardLabel="Votre défausse"
          magicDeckCount={state.magicDeck.length}
        >
          <div className="w-full h-full flex flex-col gap-1 min-h-0">
            <div className="flex items-center gap-2 px-1 shrink-0">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Votre main
              </span>
              {isLocalTurn &&
                state.phase === "play_magic_before" &&
                !pendingChoice && (
                  <button
                    onClick={actions.skipMagicBefore}
                    className="text-xs px-3 py-1 rounded-lg bg-indigo-700 hover:bg-indigo-600 text-white font-bold transition-colors shadow shadow-indigo-900/40"
                  >
                    Retourner une carte
                  </button>
                )}
              {isLocalTurn &&
                state.phase === "play_magic_after" &&
                !pendingChoice && (
                  <button
                    onClick={actions.skipMagicAfter}
                    className="text-xs px-3 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold transition-colors"
                  >
                    Finir le tour
                  </button>
                )}
            </div>
            <div className="flex-1 min-h-0">
              <MagicHand
                hand={state.players[localRole].hand}
                phase={state.phase}
                selectedCard={state.selectedMagicCard}
                onSelect={handleMagicSelect}
                disabled={disableHand}
              />
            </div>
          </div>
        </PlayerStrip>
      </main>

      {/* ── Log sidebar ──────────────────────────────────────────────────── */}
      {showLog && (
        <aside className="fixed right-3 bottom-3 z-30 w-80 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-white/10 bg-[#0a0818]/95 p-3 shadow-2xl backdrop-blur-sm">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Journal — Tour {state.turnNumber}
          </div>
          <GameLog entries={state.log} />
        </aside>
      )}

      {/* ── Choice modals ────────────────────────────────────────────────── */}
      {isLocalPending &&
        pendingChoice &&
        (pendingChoice.type === "goblin" ||
          pendingChoice.type === "choice_of_soul" ||
          pendingChoice.type === "discard_any_card") && (
          <ChoiceModal
            type={pendingChoice.type}
            hasMagicCard={state.players[localRole].hand.length > 0}
            onChoose={(choice) => {
              if (pendingChoice.type === "choice_of_soul") {
                actions.choiceOfSoulChoose(
                  choice as "draw_magic" | "gain_life",
                );
                return;
              }
              if (pendingChoice.type === "goblin") {
                actions.goblinChoose(choice as "lose_life" | "discard_magic");
                return;
              }
              actions.discardAnyChoose(choice as "lose_life" | "discard_magic");
            }}
          />
        )}

      {/* ── Game over ────────────────────────────────────────────────────── */}
      {state.phase === "game_over" && state.winner && (
        <GameOverScreen winner={state.winner} />
      )}
    </div>
  );
}
