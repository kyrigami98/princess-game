"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MagicCard, Player, PlayerID, Position } from "@/lib/types";
import { forfeitGame } from "@/lib/gameLogic";
import { useGameState } from "@/hooks/useGameState";
import GameBoard from "@/components/GameBoard";
import MagicHand from "@/components/MagicHand";
import GameLog from "@/components/GameLog";
import PhaseIndicator from "@/components/PhaseIndicator";
import ChoiceModal from "@/components/ChoiceModal";
import DeckZone from "@/components/DeckZone";
import DiscardZone from "@/components/DiscardZone";
import CardBack from "@/components/CardBack";
import CardFace from "@/components/CardFace";
import CounterModal from "@/components/CounterModal";
import TurnBanner from "@/components/TurnBanner";
import CoinFlipModal from "@/components/CoinFlipModal";

// ─── AI hand (face-down fanned cards) ────────────────────────────────────────

function AiHand({
  count,
  flipped = false,
}: {
  count: number;
  flipped?: boolean;
}) {
  const total = Math.max(count, 1);
  return (
    <div
      className={`flex ${flipped ? "items-start" : "items-end"} justify-center px-2`}
    >
      {Array.from({ length: total }).map((_, index) => {
        const angle =
          total > 1
            ? ((index - (total - 1) / 2) / ((total - 1) / 2 || 1)) * 6
            : 0;
        const lift = total > 1 ? Math.abs(index - (total - 1) / 2) * 2 : 0;
        return (
          <div
            key={index}
            className="w-24 h-36 shrink-0"
            style={{
              zIndex: total - index,
              marginLeft: index > 0 ? "-8px" : 0,
              transform: `rotate(${angle}deg) translateY(${flipped ? -lift : lift}px) ${flipped ? "scaleY(-1)" : ""}`,
              transformOrigin: flipped ? "top center" : "bottom center",
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
  children?: React.ReactNode;
}) {
  const statusBadge = (
    <div
      className={[
        "flex items-center gap-2 px-2 py-1.5 rounded-xl border shrink-0",
        isActive
          ? "border-amber-500/50 bg-amber-950/30 shadow shadow-amber-500/20"
          : "border-white/5 bg-white/3",
      ].join(" ")}
    >
      {/* Name + status */}
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-base leading-none">{isAI ? "⚔️" : "👑"}</span>
        <span className="text-[9px] font-bold text-white leading-none truncate max-w-14">
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
      {/* Life dice next to name */}
      <LifeDice lives={player.lives} />
    </div>
  );

  const sideInfo = (
    <div className="flex items-center gap-2 shrink-0">
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
  onBack?: () => void;
}

export default function Game({
  multiplayerProps,
  initialState,
  externalState,
  onBack,
}: GameProps = {}) {
  const localRole = multiplayerProps?.localRole ?? "player1";
  const opponentRole: PlayerID =
    localRole === "player1" ? "player2" : "player1";

  const { state, actions } = useGameState({
    initialState,
    externalState,
    onStateChange: multiplayerProps?.pushState,
  });

  const [showLog, setShowLog] = useState(false);
  const [confirmQuit, setConfirmQuit] = useState(false);

  // ── Coin flip animation ──────────────────────────────────────────────────
  const lastCoinFlipKey = useRef<string | null>(null);
  const [coinFlipDisplay, setCoinFlipDisplay] = useState<{
    victim: PlayerID;
    victimName: string;
  } | null>(null);

  useEffect(() => {
    if (!state.coinFlipResult) return;
    const key = `${state.coinFlipResult.turnNumber}-${state.coinFlipResult.victim}`;
    if (lastCoinFlipKey.current === key) return;
    lastCoinFlipKey.current = key;
    setCoinFlipDisplay({
      victim: state.coinFlipResult.victim,
      victimName: state.players[state.coinFlipResult.victim].name,
    });
  }, [state.coinFlipResult, state.players]);

  async function handleQuit() {
    if (multiplayerProps && state.phase !== "game_over") {
      const forfeited = forfeitGame(state, localRole);
      await multiplayerProps.pushState(forfeited);
    }
    onBack?.();
  }

  const pendingChoice = state.pendingChoice;
  const isLocalTurn = state.currentTurn === localRole;
  const isLocalCounterWindow = state.pendingCounter?.forPlayer === localRole;

  const isLocalPending = useMemo(
    () => pendingChoice?.playerId === localRole,
    [pendingChoice, localRole],
  );

  const handleCardClick = useCallback(
    (pos: Position) => {
      if (!isLocalTurn) return;
      if (state.pendingCounter) return; // blocage pendant fenêtre de contre
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
    !!(pendingChoice && isLocalPending) ||
    !!state.pendingCounter;

  return (
    <div className="h-screen game-bg text-white overflow-hidden flex flex-col">
      <main className="flex-1 min-h-0 grid grid-rows-[auto_minmax(0,1fr)_auto] gap-1.5 p-1.5 overflow-hidden">
        {/* ── Opponent strip ───────────────────────────────────────────── */}
        <PlayerStrip
          player={state.players[opponentRole]}
          isActive={state.currentTurn === opponentRole}
          isAI
          discardLabel="Défausse adversaire"
          magicDeckCount={state.magicDeck.length}
          mirrored
        />

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
              isLocalTurn={isLocalTurn}
              waitingForCounter={
                !!state.pendingCounter && !isLocalCounterWindow
              }
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
              {!confirmQuit ? (
                <button
                  onClick={() => setConfirmQuit(true)}
                  className="text-[10px] px-2 py-0.5 rounded-lg border border-rose-700/40 text-rose-500 hover:text-rose-300 hover:border-rose-500/60 transition-colors"
                >
                  Quitter
                </button>
              ) : (
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-rose-400">Confirmer ?</span>
                  <button
                    onClick={handleQuit}
                    className="text-[10px] px-2 py-0.5 rounded-lg bg-rose-700 hover:bg-rose-600 text-white font-bold transition-colors"
                  >
                    Oui
                  </button>
                  <button
                    onClick={() => setConfirmQuit(false)}
                    className="text-[10px] px-2 py-0.5 rounded-lg border border-white/10 text-slate-400 hover:text-white transition-colors"
                  >
                    Non
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Grid */}
          <div className="relative z-10 flex-1 min-h-0 overflow-auto p-2">
            <div className="min-w-max min-h-full flex items-center justify-center">
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
        />
      </main>
      {/* ── Opponent hand — fixed top edge ───────────────────────────── */}
      <div
        className="fixed left-0 right-0 top-0 z-5 flex justify-center pointer-events-none"
        style={{ transform: "translateY(-2rem)" }}
      >
        <AiHand count={state.players[opponentRole].hand.length} flipped />
      </div>
      {/* ── Phase action buttons — floating above local hand ──────────── */}
      {isLocalTurn && !pendingChoice && !state.pendingCounter && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-30 flex gap-3"
          style={{ bottom: "9rem" }}
        >
          {state.phase === "play_magic_before" && (
            <button
              onClick={actions.skipMagicBefore}
              className="text-sm px-5 py-2 rounded-xl bg-indigo-700 hover:bg-indigo-600 text-white font-bold transition-all shadow-lg shadow-indigo-900/50 hover:scale-105 active:scale-95"
            >
              ↩ Retourner une carte
            </button>
          )}
          {state.phase === "play_magic_after" && (
            <button
              onClick={actions.skipMagicAfter}
              className="text-sm px-5 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold transition-all shadow-lg shadow-black/40 hover:scale-105 active:scale-95"
            >
              ✓ Finir le tour
            </button>
          )}
        </div>
      )}
      {/* ── Local hand — fixed bottom edge, partially off-screen ─────── */}
      <div
        className="fixed left-0 right-0 bottom-0 z-20 pb-0"
        style={{ transform: "translateY(2rem)" }}
      >
        <MagicHand
          hand={state.players[localRole].hand}
          phase={state.phase}
          selectedCard={state.selectedMagicCard}
          onSelect={handleMagicSelect}
          disabled={disableHand}
        />
      </div>
      {/* ── Log sidebar ──────────────────────────────────────────────────── */}{" "}
      {showLog && (
        <aside className="fixed right-3 bottom-3 z-30 w-80 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-white/10 bg-[#0a0818]/95 p-3 shadow-2xl backdrop-blur-sm">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Journal — Tour {state.turnNumber}
          </div>
          <GameLog entries={state.log} />
        </aside>
      )}
      {/* ── Fenêtre de contre-magie (joueur local) ────────────────────────────────── */}
      {isLocalCounterWindow && state.pendingCounter && (
        <CounterModal
          pendingCounter={state.pendingCounter}
          counterCards={state.players[localRole].hand.filter((c) =>
            state.pendingCounter?.kind === "character"
              ? c.effect === "immunity"
              : state.pendingCounter?.kind === "barrier"
                ? c.effect === "barrier"
                : c.effect === "counter_magic",
          )}
          onResolve={(counterCardId) => actions.resolveCounter(counterCardId)}
        />
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
      {/* ── Turn banner ─────────────────────────────────────────── */}
      <TurnBanner
        currentTurn={state.currentTurn}
        localRole={localRole}
        phase={state.phase}
        localName={state.players[localRole].name}
        opponentName={state.players[opponentRole].name}
      />
      {/* ── Coin flip animation ───────────────────────────────────────── */}
      {coinFlipDisplay && (
        <CoinFlipModal
          victim={coinFlipDisplay.victim}
          victimName={coinFlipDisplay.victimName}
          localRole={localRole}
          onDone={() => setCoinFlipDisplay(null)}
        />
      )}
      {/* ── Game over banner ───────────────────────────────────────── */}
      {state.phase === "game_over" && state.winner && (
        <div
          className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-2.5 rounded-2xl border shadow-2xl backdrop-blur-sm"
          style={{
            background:
              state.winner === localRole
                ? "rgba(120,53,15,0.92)"
                : "rgba(30,10,60,0.92)",
            borderColor:
              state.winner === localRole
                ? "rgba(251,191,36,0.6)"
                : "rgba(139,92,246,0.5)",
          }}
        >
          <span className="text-2xl">
            {state.winner === localRole ? "👑" : "⚔️"}
          </span>
          <div>
            <p className="text-white font-bold text-sm leading-tight">
              {state.winner === localRole ? "Victoire !" : "Défaite..."}
            </p>
            <p className="text-white/60 text-xs">
              {state.winner === localRole
                ? "Votre adversaire a quitté la partie."
                : "Votre adversaire a remporté la partie."}
            </p>
          </div>{" "}
          {onBack && (
            <button
              onClick={onBack}
              className="ml-2 text-[11px] px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold transition-colors shrink-0"
            >
              Retour au menu
            </button>
          )}{" "}
        </div>
      )}
    </div>
  );
}
