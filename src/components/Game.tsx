"use client";

import { useCallback, useMemo, useState } from "react";
import type { MagicCard, Player, Position } from "@/lib/types";
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

function AiHand({ count }: { count: number }) {
  const total = Math.max(count, 1);
  return (
    <div className="flex items-end justify-center px-2">
      {Array.from({ length: total }).map((_, index) => {
        const angle =
          total > 1
            ? ((index - (total - 1) / 2) / ((total - 1) / 2 || 1)) * 6
            : 0;
        const lift = total > 1 ? Math.abs(index - (total - 1) / 2) * 2 : 0;
        return (
          <div
            key={index}
            className="w-9 h-14 sm:w-10 sm:h-14 shrink-0"
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

// Dot positions for a 3×3 grid: 1 = dot present
const DICE_DOTS: Record<number, boolean[]> = {
  //      tl     tc     tr     ml     mc     mr     bl     bc     br
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
      <div className="w-8 h-8 rounded-md bg-slate-800 border-2 border-slate-600 shadow-inner grid grid-cols-3 grid-rows-3 p-1 gap-0.5">
        {dots.map((on, i) => (
          <div
            key={i}
            className={`rounded-full ${on ? "bg-rose-400 shadow-sm shadow-rose-500/60" : ""}`}
          />
        ))}
      </div>
      <span className="text-[9px] font-bold text-rose-400">{value}</span>
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

function SideDecks({
  magicCount,
  lifeCount,
}: {
  magicCount: number;
  lifeCount: number;
}) {
  return (
    <div className="flex flex-row gap-1.5 shrink-0">
      <DeckZone label="Vie" count={lifeCount} icon="❤️" tone="rose" strip />
      <DeckZone
        label="Magie"
        count={magicCount}
        icon="🃏"
        tone="indigo"
        strip
      />
    </div>
  );
}

/** Compact horizontal strip for one player side */
function PlayerStrip({
  player,
  isActive,
  isAI,
  discardLabel,
  magicDeckCount,
  lifeDeckCount,
  mirrored,
  children,
}: {
  player: Player;
  isActive: boolean;
  isAI?: boolean;
  discardLabel: string;
  magicDeckCount: number;
  lifeDeckCount: number;
  mirrored?: boolean;
  children: React.ReactNode; // hand zone
}) {
  const statusBadge = (
    <div
      className={[
        "flex flex-col items-center justify-center gap-1 px-2 py-1.5 rounded-xl border shrink-0 min-w-12",
        isActive
          ? "border-amber-500/60 bg-amber-950/40 shadow shadow-amber-500/20"
          : "border-slate-700/40 bg-slate-900/20",
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
    <div className="flex items-center gap-1.5 shrink-0">
      <LifeDice lives={player.lives} />
      <DiscardZone label={discardLabel} cards={player.discardPile} strip />
      <SideDecks magicCount={magicDeckCount} lifeCount={lifeDeckCount} />
    </div>
  );

  return (
    <section
      className={[
        "flex items-center gap-2 px-2 py-1.5 rounded-2xl border overflow-hidden",
        isActive
          ? "border-amber-500/30 bg-slate-900/60"
          : "border-slate-800/60 bg-slate-900/30",
      ].join(" ")}
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

export default function Game() {
  const { state, actions } = useGameState();
  const [showLog, setShowLog] = useState(false);

  const pendingChoice = state.pendingChoice;
  const isHumanTurn = state.currentTurn === "human";

  const isHumanPending = useMemo(
    () => pendingChoice?.playerId === "human",
    [pendingChoice],
  );

  const handleCardClick = useCallback(
    (pos: Position) => {
      if (pendingChoice?.type === "fairy_peek" && isHumanPending) {
        actions.fairyPeek(pos);
        return;
      }

      if (pendingChoice?.type === "manipulation" && isHumanPending) {
        actions.manipulationTarget(pos);
        return;
      }

      actions.flipCard(pos);
    },
    [actions, pendingChoice, isHumanPending],
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

  const flippedCount = state.grid.flat().filter((card) => card.flipped).length;
  const totalCards = state.grid.flat().length;

  const disableHand =
    state.phase === "game_over" ||
    !isHumanTurn ||
    !!(pendingChoice && isHumanPending);

  return (
    <div className="h-screen bg-slate-950 text-white overflow-hidden flex flex-col">
      <main className="flex-1 min-h-0 grid grid-rows-[auto_minmax(0,1fr)_160px] gap-2 p-2 sm:p-3 overflow-hidden">
        <PlayerStrip
          player={state.players.ai}
          isActive={state.currentTurn === "ai"}
          isAI
          discardLabel="Défausse IA"
          magicDeckCount={state.magicDeck.length}
          lifeDeckCount={state.lifeDeck}
          mirrored
        >
          <AiHand count={state.players.ai.hand.length} />
        </PlayerStrip>

        <section className="min-h-0 rounded-2xl border border-slate-700 bg-linear-to-b from-slate-900/80 via-slate-900/55 to-slate-950/80 p-2 sm:p-3 flex flex-col overflow-hidden shadow-2xl shadow-black/20">
          <div className="flex items-center gap-2 mb-2 shrink-0">
            <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${(flippedCount / totalCards) * 100}%` }}
              />
            </div>
            <span className="text-xs text-slate-400 shrink-0">
              {flippedCount}/{totalCards}
            </span>
            <button
              onClick={() => setShowLog((value) => !value)}
              className={`text-xs px-2 py-0.5 rounded-lg border transition-colors ${
                showLog
                  ? "border-indigo-500 text-indigo-300 bg-indigo-950/50"
                  : "border-slate-700 text-slate-400 hover:text-white"
              }`}
            >
              📜
            </button>
            <button
              onClick={actions.newGame}
              className="text-xs px-2 py-0.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
            >
              ↺
            </button>
          </div>

          <div className="shrink-0 mb-2">
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
          </div>

          <div className="flex-1 min-h-0 flex items-center justify-center overflow-hidden">
            <div className="h-full max-h-full aspect-square w-auto max-w-full">
              <GameBoard state={state} onCardClick={handleCardClick} />
            </div>
          </div>
        </section>

        <PlayerStrip
          player={state.players.human}
          isActive={state.currentTurn === "human"}
          discardLabel="Votre défausse"
          magicDeckCount={state.magicDeck.length}
          lifeDeckCount={state.lifeDeck}
        >
          <div className="w-full h-full flex flex-col gap-1 min-h-0">
            <div className="flex items-center gap-2 px-1 text-xs text-slate-400 shrink-0">
              <span className="font-semibold uppercase tracking-wider text-[10px]">
                Votre main
              </span>
              {isHumanTurn &&
                state.phase === "play_magic_before" &&
                !pendingChoice && (
                  <button
                    onClick={actions.skipMagicBefore}
                    className="text-xs px-2.5 py-1 rounded-lg bg-indigo-700 hover:bg-indigo-600 text-white font-bold transition-colors"
                  >
                    Retourner une carte
                  </button>
                )}
              {isHumanTurn &&
                state.phase === "play_magic_after" &&
                !pendingChoice && (
                  <button
                    onClick={actions.skipMagicAfter}
                    className="text-xs px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold transition-colors"
                  >
                    Finir le tour
                  </button>
                )}
            </div>
            <div className="flex-1 min-h-0">
              <MagicHand
                hand={state.players.human.hand}
                phase={state.phase}
                selectedCard={state.selectedMagicCard}
                onSelect={handleMagicSelect}
                disabled={disableHand}
              />
            </div>
          </div>
        </PlayerStrip>
      </main>

      {showLog && (
        <aside className="fixed right-3 bottom-3 z-30 w-80 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-slate-800 bg-slate-950/95 p-3 shadow-2xl">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Journal — Tour {state.turnNumber}
          </div>
          <GameLog entries={state.log} />
        </aside>
      )}

      {isHumanPending &&
        pendingChoice &&
        (pendingChoice.type === "goblin" ||
          pendingChoice.type === "choice_of_soul" ||
          pendingChoice.type === "discard_any_card") && (
          <ChoiceModal
            type={pendingChoice.type}
            hasMagicCard={state.players.human.hand.length > 0}
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

      {state.phase === "game_over" && state.winner && (
        <GameOverScreen winner={state.winner} onRestart={actions.newGame} />
      )}
    </div>
  );
}
