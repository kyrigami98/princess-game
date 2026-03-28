"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  GridCard,
  MagicCard,
  Player,
  PlayerID,
  Position,
} from "@/lib/types";
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
import CardFace, { type CardData } from "@/components/CardFace";
import CounterModal from "@/components/CounterModal";
import TurnBanner from "@/components/TurnBanner";
import CoinFlipModal from "@/components/CoinFlipModal";
import CounterResultToast from "@/components/CounterResultToast";
import DiscardPickModal from "@/components/DiscardPickModal";
import ProtectionChoiceModal from "@/components/ProtectionChoiceModal";

interface DamageProjectile {
  id: number;
  fromX: number; fromY: number;
  toX: number; toY: number;
  color: string;
}

// ─── Skip-turn toast ─────────────────────────────────────────────────────────
function SkipTurnToast({ isLocal, playerName, onDone }: { isLocal: boolean; playerName: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <style>{`
        @keyframes skipSlide {
          0%   { opacity: 0; transform: translateX(-50%) translateY(-12px); }
          12%  { opacity: 1; transform: translateX(-50%) translateY(0); }
          80%  { opacity: 1; transform: translateX(-50%) translateY(0); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-8px); }
        }
      `}</style>
      <div
        style={{
          animation: "skipSlide 3s ease forwards",
          left: "50%",
          position: "relative",
          background: isLocal ? "rgba(30,10,10,0.92)" : "rgba(10,20,35,0.92)",
          backdropFilter: "blur(8px)",
          boxShadow: isLocal
            ? "0 0 0 1px rgba(239,68,68,0.4), 0 0 32px rgba(200,40,40,0.2), 0 8px 32px rgba(0,0,0,0.6)"
            : "0 0 0 1px rgba(148,163,184,0.3), 0 0 24px rgba(100,116,139,0.15), 0 8px 32px rgba(0,0,0,0.6)",
        }}
        className={`flex items-center gap-3 px-5 py-3 rounded-2xl border min-w-56 ${
          isLocal ? "border-red-500/40" : "border-slate-500/30"
        }`}
      >
        <span className="text-2xl shrink-0">{isLocal ? "⏸" : "⏭"}</span>
        <div>
          <p className={`font-bold text-sm leading-tight ${isLocal ? "text-red-300" : "text-slate-200"}`}>
            {isLocal ? "Tour passé !" : "Tour passé"}
          </p>
          <p className="text-slate-400 text-xs mt-0.5 leading-snug">
            {isLocal
              ? "Votre tour a été sauté à cause d'un sort."
              : `${playerName} passe son tour.`}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Opponent hand — exact mirror of MagicHand ────────────────────────────────
// Each card pivots from its OWN top-center (not a shared point).
// Produces the same gentle TCG arc as the local player, but flipped.

function AiHand({ count }: { count: number }) {
  if (count === 0) return null;
  const maxAngle = Math.min(count * 1.5, 8);

  return (
    <div className="flex items-start justify-center w-full overflow-visible px-4">
      <div className="flex items-start justify-center">
        {Array.from({ length: count }).map((_, i) => {
          const angle =
            count > 1
              ? ((i - (count - 1) / 2) / ((count - 1) / 2 || 1)) * maxAngle
              : 0;
          // Mirror of MagicHand: outer cards lift upward (negative translateY)
          const translateY = count > 1 ? -(Math.abs(angle / maxAngle) * 6) : 0;

          return (
            <div
              key={i}
              className="w-24 h-36 shrink-0"
              style={{
                marginLeft: i > 0 ? "-8px" : 0,
                zIndex: count - Math.abs(i - (count - 1) / 2),
                transform: `rotate(${angle}deg) translateY(${translateY}px)`,
                transformOrigin: "top center",
              }}
            >
              <CardBack />
            </div>
          );
        })}
      </div>
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

const PLAYER_COLORS = {
  player1: {
    dieBg: "from-rose-950 to-red-900",
    dieBorder: "border-rose-700/80",
    dotOn: "bg-rose-300 shadow-sm shadow-rose-400/80",
    lives: "text-rose-300",
    name: "text-rose-300",
    ring: "ring-rose-500/40",
    stripActive: "border-rose-500/25 bg-rose-950/10 shadow-rose-500/5",
    stripDot: "bg-rose-500",
  },
  player2: {
    dieBg: "from-blue-950 to-blue-900",
    dieBorder: "border-blue-700/80",
    dotOn: "bg-blue-300 shadow-sm shadow-blue-400/80",
    lives: "text-blue-300",
    name: "text-blue-300",
    ring: "ring-blue-500/40",
    stripActive: "border-blue-500/25 bg-blue-950/10 shadow-blue-500/5",
    stripDot: "bg-blue-500",
  },
} as const;

function Die({ value, color }: { value: number; color: keyof typeof PLAYER_COLORS }) {
  const dots = DICE_DOTS[value] ?? DICE_DOTS[6];
  const c = PLAYER_COLORS[color];
  return (
    <div className={`w-9 h-9 rounded-lg bg-linear-to-br ${c.dieBg} border-2 ${c.dieBorder} shadow-inner shadow-black/40 grid grid-cols-3 grid-rows-3 p-1.5 gap-0.5`}>
      {dots.map((on, i) => (
        <div
          key={i}
          className={`rounded-full ${on ? c.dotOn : ""}`}
        />
      ))}
    </div>
  );
}

function LifeDice({ lives, color }: { lives: number; color: keyof typeof PLAYER_COLORS }) {
  const first = Math.min(lives, 6);
  const second = lives > 6 ? Math.min(lives - 6, 6) : null;
  const c = PLAYER_COLORS[color];
  return (
    <div className="flex items-center gap-2 shrink-0">
      {second !== null && <Die value={second} color={color} />}
      <Die value={first} color={color} />
      <span className={`text-2xl font-black ${c.lives} tabular-nums leading-none`}>
        {lives}
      </span>
    </div>
  );
}

// ─── Mini terrain overview ─────────────────────────────────────────────────

// (removed — remplacé par le panel de prévisualisation au hover)

// ─── Player strip ─────────────────────────────────────────────────────────────

function PlayerStrip({
  player,
  isActive,
  isAI,
  discardLabel,
  magicDeckCount,
  mirrored,
  color,
  children,
  playerId,
}: {
  player: Player;
  isActive: boolean;
  isAI?: boolean;
  discardLabel: string;
  magicDeckCount: number;
  mirrored?: boolean;
  color: keyof typeof PLAYER_COLORS;
  children?: React.ReactNode;
  playerId?: string;
}) {
  const c = PLAYER_COLORS[color];
  const nameLabel = (
    <div className="flex flex-col items-center gap-1 shrink-0">
      <div className="flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full ${c.stripDot} shrink-0`} />
        <span
          className={[
            "text-sm font-bold leading-none truncate max-w-24",
            isActive ? c.name : "text-white/70",
          ].join(" ")}
        >
          {player.name}
        </span>
      </div>
      {/* Status effects */}
      <div className="flex flex-wrap gap-0.5 justify-center">
        {player.immuneNextSingleLifeLoss && <span className="text-[10px]">🛡️</span>}
        {player.counterMagicActive && <span className="text-[10px]">🌀</span>}
        {player.immuneCharacterEffect && <span className="text-[10px]">✴️</span>}
        {player.immuneNextMagic && <span className="text-[10px]">🔰</span>}
        {player.skipNextTurn && <span className="text-[10px]">⏩</span>}
      </div>
    </div>
  );

  const livesBadge = (
    <div className="shrink-0 px-1">
      <LifeDice lives={player.lives} color={color} />
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
      data-player-lives={playerId}
      className={[
        "flex items-center gap-2 px-3 py-2 rounded-2xl border overflow-hidden transition-all duration-300",
        isActive
          ? `${c.stripActive} shadow-lg`
          : "border-white/5 bg-white/3",
      ].join(" ")}
      style={{ backdropFilter: "blur(8px)" }}
    >
      {mirrored ? (
        <>
          {sideInfo}
          <div className="flex-1 min-w-0 min-h-0 self-stretch">{children}</div>
          {livesBadge}
          {nameLabel}
        </>
      ) : (
        <>
          {nameLabel}
          {livesBadge}
          <div className="flex-1 min-w-0 min-h-0 self-stretch">{children}</div>
          {sideInfo}
        </>
      )}
    </section>
  );
}

// ─── Damage particle ─────────────────────────────────────────────────────────

function DamageParticle({ fromX, fromY, toX, toY, color }: Omit<DamageProjectile, 'id'>) {
  const [launched, setLaunched] = useState(false);
  const [impact, setImpact] = useState(false);
  const dx = toX - fromX;
  const dy = toY - fromY;

  useEffect(() => {
    const r1 = requestAnimationFrame(() =>
      requestAnimationFrame(() => setLaunched(true))
    );
    const t1 = setTimeout(() => setImpact(true), 420);
    return () => { cancelAnimationFrame(r1); clearTimeout(t1); };
  }, []);

  return (
    <>
      {/* Projectile orb */}
      <div
        style={{
          position: 'fixed',
          left: fromX,
          top: fromY,
          width: 12,
          height: 12,
          borderRadius: '50%',
          background: color,
          boxShadow: `0 0 16px 5px ${color}, 0 0 4px 1px white`,
          transform: `translate(-50%, -50%) translate(${launched ? dx : 0}px, ${launched ? dy : 0}px) scale(${launched ? 0.5 : 1})`,
          transition: 'transform 0.42s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.1s 0.38s',
          opacity: launched ? (impact ? 0 : 1) : 0.9,
          pointerEvents: 'none',
          zIndex: 9998,
        }}
      />
      {/* Impact burst at target */}
      {impact && (
        <div
          className="proj-impact"
          style={{
            position: 'fixed',
            left: toX,
            top: toY,
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: color,
            boxShadow: `0 0 20px 8px ${color}`,
            pointerEvents: 'none',
            zIndex: 9998,
          }}
        />
      )}
    </>
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
  const [hoveredCard, setHoveredCard] = useState<CardData | null>(null);

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

  // ── Skip-turn toast ──────────────────────────────────────────────────────
  const lastSkippedKey = useRef<string | null>(null);
  const [skipToast, setSkipToast] = useState<{ isLocal: boolean; playerName: string } | null>(null);

  useEffect(() => {
    if (!state.lastSkippedTurn) return;
    const key = `${state.lastSkippedTurn.player}-${state.lastSkippedTurn.turnNumber}`;
    if (lastSkippedKey.current === key) return;
    lastSkippedKey.current = key;
    const isLocal = state.lastSkippedTurn.player === localRole;
    setSkipToast({ isLocal, playerName: state.players[state.lastSkippedTurn.player].name });
  }, [state.lastSkippedTurn, state.players, localRole]);

  // ── Counter result toast ─────────────────────────────────────────────────
  const lastCounterEventKey = useRef<string | null>(null);
  const [counterToast, setCounterToast] = useState<{
    counterCardName: string;
    counterCardEmoji: string;
    counterCardEffect: string;
    blockedEffectName: string;
    counterPlayerName: string;
  } | null>(null);

  useEffect(() => {
    if (!state.lastCounterEvent) return;
    const key = `${state.lastCounterEvent.turnNumber}-${state.lastCounterEvent.counterPlayerName}-${state.lastCounterEvent.blockedEffectName}`;
    if (lastCounterEventKey.current === key) return;
    lastCounterEventKey.current = key;
    setCounterToast({
      counterCardName: state.lastCounterEvent.counterCardName,
      counterCardEmoji: state.lastCounterEvent.counterCardEmoji,
      counterCardEffect: state.lastCounterEvent.counterCardEffect,
      blockedEffectName: state.lastCounterEvent.blockedEffectName,
      counterPlayerName: state.lastCounterEvent.counterPlayerName,
    });
  }, [state.lastCounterEvent]);

  // ── Damage projectile animation ──────────────────────────────────────────
  const prevLivesRef = useRef<Record<string, number> | null>(null);
  const [projectiles, setProjectiles] = useState<DamageProjectile[]>([]);
  const projIdRef = useRef(0);

  useEffect(() => {
    const p1 = state.players.player1.lives;
    const p2 = state.players.player2.lives;
    if (!prevLivesRef.current) {
      prevLivesRef.current = { player1: p1, player2: p2 };
      return;
    }
    const prev = prevLivesRef.current;
    prevLivesRef.current = { player1: p1, player2: p2 };

    for (const pid of ['player1', 'player2'] as ('player1' | 'player2')[]) {
      if (state.players[pid].lives < prev[pid]) {
        const srcPos = state.lastFlippedCard?.position;
        const srcEl = srcPos
          ? document.querySelector<HTMLElement>(`[data-card-pos="${srcPos.row}-${srcPos.col}"]`)
          : null;
        const tgtEl = document.querySelector<HTMLElement>(`[data-player-lives="${pid}"]`);
        if (!srcEl || !tgtEl) continue;
        const srcRect = srcEl.getBoundingClientRect();
        const tgtRect = tgtEl.getBoundingClientRect();
        const id = ++projIdRef.current;
        setProjectiles((ps) => [
          ...ps,
          {
            id,
            fromX: srcRect.left + srcRect.width / 2,
            fromY: srcRect.top + srcRect.height / 2,
            toX: tgtRect.left + tgtRect.width / 2,
            toY: tgtRect.top + tgtRect.height / 2,
            color: pid === 'player1' ? 'rgba(239,68,68,0.95)' : 'rgba(96,165,250,0.95)',
          },
        ]);
        setTimeout(() => setProjectiles((ps) => ps.filter((x) => x.id !== id)), 650);
      }
    }
  }, [state.players.player1.lives, state.players.player2.lives, state.lastFlippedCard]);

  // ── Scroll to opponent's flipped card ───────────────────────────────────
  const lastFlippedId = state.lastFlippedCard?.id ?? null;
  useEffect(() => {
    if (!state.lastFlippedCard) return;
    if (state.currentTurn === localRole) return; // c'est moi qui ai retourné
    const { row, col } = state.lastFlippedCard.position;
    const el = document.querySelector(`[data-card-pos="${row}-${col}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastFlippedId]);

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
        {/* ── Opponent hand — fixed top edge, partially off-screen ─────── */}
        <div
          className="fixed left-0 right-0 top-0 z-20 pt-0 pointer-events-none"
          style={{ transform: "translateY(-2rem)" }}
        >
          <AiHand count={state.players[opponentRole].hand.length} />
        </div>

        {/* ── Opponent strip ───────────────────────────────────────────── */}
        <PlayerStrip
          player={state.players[opponentRole]}
          isActive={state.currentTurn === opponentRole}
          isAI
          discardLabel="Défausse adversaire"
          magicDeckCount={state.magicDeck.length}
          mirrored
          color={opponentRole}
          playerId={opponentRole}
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
              <span className="lg:hidden text-[10px] text-slate-500 tabular-nums">
                {flippedCount}/{totalCards}
              </span>
              <button
                onClick={() => setShowLog((v) => !v)}
                className={`lg:hidden text-xs px-2 py-0.5 rounded-lg border transition-colors ${
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

          {/* Grid — 3-column layout: mini terrain | board | log */}
          <div className="relative z-10 flex flex-1 min-h-0 overflow-hidden">
            {/* ── Left: card hover preview (desktop only) ── */}
            <div
              className="hidden lg:flex shrink-0 flex-col border-r border-white/[0.07] overflow-hidden"
              style={{ aspectRatio: "2/3" }}
            >
              {hoveredCard ? (
                <div className="w-full h-full overflow-hidden">
                  <CardFace
                    card={hoveredCard}
                    size="lg"
                    className="w-full h-full"
                  />
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-2 px-3">
                  <span className="text-2xl opacity-20">🃏</span>
                  <p className="text-slate-600 text-[11px] text-center leading-snug">
                    Survole une carte pour l&apos;apercevoir ici
                  </p>
                </div>
              )}
            </div>

            {/* ── Center: board ── */}
            <div className="flex-1 min-h-0 overflow-auto p-2">
              <div className="min-w-max min-h-full flex items-center justify-center">
                <GameBoard
                  state={state}
                  onCardClick={handleCardClick}
                  viewerID={localRole}
                  onCardHover={setHoveredCard}
                />
              </div>
            </div>

            {/* ── Right: game log (desktop only) ── */}
            <div
              className="hidden lg:flex shrink-0 flex-col border-l border-white/[0.07] px-2 pt-2 pb-1 gap-1"
              style={{ aspectRatio: "2/3" }}
            >
              <span className="text-[9px] text-slate-500 uppercase tracking-wider shrink-0 font-semibold">
                Historique · Tour {state.turnNumber}
              </span>
              <div className="flex-1 min-h-0 overflow-hidden">
                <GameLog entries={state.log} localRole={localRole} className="h-full" />
              </div>
            </div>
          </div>
        </section>

        {/* ── Human strip ──────────────────────────────────────────────── */}
        <PlayerStrip
          player={state.players[localRole]}
          isActive={isLocalTurn}
          discardLabel="Votre défausse"
          magicDeckCount={state.magicDeck.length}
          color={localRole}
          playerId={localRole}
        />
      </main>
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
        className="fixed left-0 right-0 bottom-0 z-20 pb-0 pointer-events-none"
        style={{ transform: "translateY(2rem)" }}
      >
        <MagicHand
          hand={state.players[localRole].hand}
          phase={state.phase}
          selectedCard={state.selectedMagicCard}
          onSelect={handleMagicSelect}
          disabled={disableHand}
          onCardHover={setHoveredCard}
        />
      </div>
      {/* ── Log sidebar (mobile only) ──────────────────────────────────────── */}{" "}
      {showLog && (
        <aside className="lg:hidden fixed right-3 bottom-3 z-30 w-80 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-white/10 bg-[#0a0818]/95 p-3 shadow-2xl backdrop-blur-sm">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Journal — Tour {state.turnNumber}
          </div>
          <GameLog entries={state.log} localRole={localRole} />
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
        (pendingChoice.type === "goblin" || pendingChoice.type === "choice_of_soul") && (
          <ChoiceModal
            type={pendingChoice.type}
            hasMagicCard={state.players[localRole].hand.length > 0}
            triggerCardEffect={pendingChoice.triggerCardEffect ?? state.lastFlippedCard?.effect}
            triggerCardLabel={pendingChoice.triggerCardLabel ?? state.lastFlippedCard?.label}
            onChoose={(choice) => {
              if (pendingChoice.type === "choice_of_soul") {
                actions.choiceOfSoulChoose(choice as "draw_magic" | "gain_life");
                return;
              }
              actions.goblinChoose(choice as "lose_life" | "discard_magic");
            }}
          />
        )}
      {isLocalPending && pendingChoice?.type === "discard_any_card" && (
        <DiscardPickModal
          hand={state.players[localRole].hand}
          onPickCard={(cardId) => actions.discardSpecificCard(cardId)}
          onLoseLife={() => actions.discardAnyChoose("lose_life")}
          triggerCardEffect={state.lastFlippedCard?.effect}
          triggerCardLabel={state.lastFlippedCard?.label}
        />
      )}
      {isLocalPending && pendingChoice?.type === "discard_choose" && (
        <DiscardPickModal
          hand={state.players[localRole].hand}
          onPickCard={(cardId) => actions.discardChoose(cardId)}
          title="Quelle carte défausser ?"
          description={
            pendingChoice.thenDraw
              ? "Défaussez 1 carte de MAGIE, puis vous en piochez 1."
              : "Défaussez 1 carte de MAGIE."
          }
          triggerCardEffect={state.lastFlippedCard?.effect}
          triggerCardLabel={state.lastFlippedCard?.label}
        />
      )}
      {isLocalPending && pendingChoice?.type === "gravedigger" && (
        <DiscardPickModal
          hand={state.players[localRole].hand}
          onPickCard={(cardId) => actions.gravediggerChoose(cardId)}
          title="Quelle carte donner ?"
          description="Le Fossoyeur VIJO — donnez 1 carte de MAGIE à votre adversaire."
          triggerCardEffect={state.lastFlippedCard?.effect}
          triggerCardLabel={state.lastFlippedCard?.label}
        />
      )}
      {isLocalPending && pendingChoice?.type === "goblin_discard" && (
        <DiscardPickModal
          hand={state.players[localRole].hand}
          onPickCard={(cardId) => actions.goblinDiscardSpecific(cardId)}
          title="Quelle carte défausser ?"
          description="Le Gobelin — choisissez la carte de MAGIE à défausser."
          triggerCardEffect={state.lastFlippedCard?.effect}
          triggerCardLabel={state.lastFlippedCard?.label}
        />
      )}
      {isLocalPending && pendingChoice?.type === "druid_magic" && (
        <DiscardPickModal
          hand={state.players[localRole].hand}
          onPickCard={(cardId) => actions.druidMagicChoose(cardId)}
          title="Quelle carte de MAGIE défausser ?"
          description="Le Druide LORINO — défaussez 1 carte de MAGIE."
          triggerCardEffect={state.lastFlippedCard?.effect}
          triggerCardLabel={state.lastFlippedCard?.label}
        />
      )}
      {isLocalPending && pendingChoice?.type === "protection_choice" && (
        <ProtectionChoiceModal
          playerName={state.players[localRole].name}
          options={pendingChoice.protectionOptions ?? []}
          barrierCard={state.players[localRole].hand.find((c) => c.effect === "barrier")}
          triggerCardEffect={pendingChoice.triggerCardEffect ?? state.lastFlippedCard?.effect}
          triggerCardLabel={pendingChoice.triggerCardLabel ?? state.lastFlippedCard?.label}
          onChoose={(choice) => actions.resolveProtection(choice)}
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
      {/* ── Skip-turn toast ───────────────────────────────────────────────── */}
      {skipToast && (
        <SkipTurnToast
          isLocal={skipToast.isLocal}
          playerName={skipToast.playerName}
          onDone={() => setSkipToast(null)}
        />
      )}
      {/* ── Counter result toast ───────────────────────────────────────────── */}
      {counterToast && (
        <CounterResultToast
          counterCardName={counterToast.counterCardName}
          counterCardEmoji={counterToast.counterCardEmoji}
          counterCardEffect={counterToast.counterCardEffect}
          blockedEffectName={counterToast.blockedEffectName}
          counterPlayerName={counterToast.counterPlayerName}
          onDone={() => setCounterToast(null)}
        />
      )}
      {/* ── Coin flip animation ───────────────────────────────────────── */}
      {coinFlipDisplay && (
        <CoinFlipModal
          victim={coinFlipDisplay.victim}
          victimName={coinFlipDisplay.victimName}
          localRole={localRole}
          onDone={() => setCoinFlipDisplay(null)}
        />
      )}
      {/* ── Damage projectiles ──────────────────────────────────────── */}
      {projectiles.map((p) => (
        <DamageParticle key={p.id} fromX={p.fromX} fromY={p.fromY} toX={p.toX} toY={p.toY} color={p.color} />
      ))}
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
