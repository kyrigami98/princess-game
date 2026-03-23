'use client';

import { useState, useCallback } from 'react';
import type { Position, MagicCard, Player } from '@/lib/types';
import { useGameState } from '@/hooks/useGameState';
import GameBoard from '@/components/GameBoard';
import MagicHand from '@/components/MagicHand';
import GameLog from '@/components/GameLog';
import PhaseIndicator from '@/components/PhaseIndicator';
import GameOverScreen from '@/components/GameOverScreen';
import ChoiceModal from '@/components/ChoiceModal';

// ─── Inline compact player display ───────────────────────────────────────────

function PlayerBar({ player, isActive, isAI }: { player: Player; isActive: boolean; isAI?: boolean }) {
  const MAX_LIVES = 5;
  return (
    <div className={[
      'flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-300',
      isActive
        ? 'border-amber-500/60 bg-amber-950/40 shadow shadow-amber-500/20'
        : 'border-slate-700/60 bg-slate-900/30',
    ].join(' ')}>
      <span className="text-base">{isAI ? '🤖' : '👑'}</span>
      <span className="text-xs font-bold text-white hidden sm:block">{player.name}</span>
      {/* Lives */}
      <div className="flex gap-px">
        {Array.from({ length: MAX_LIVES }).map((_, i) => (
          <span key={i} className={`text-xs ${i < player.lives ? '' : 'opacity-15 grayscale'}`}>❤️</span>
        ))}
      </div>
      {/* Status badges */}
      {player.shielded            && <span title="Bouclier actif"   className="text-xs">🛡️</span>}
      {player.cursed              && <span title="Restriction"       className="text-xs">⛓️</span>}
      {player.nullifyNext         && <span title="Annulation prête"  className="text-xs">✴️</span>}
      {player.counterMagicActive  && <span title="Contre Magie"      className="text-xs">🌀</span>}
      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse ml-1" />}
    </div>
  );
}

// ─── Game ──────────────────────────────────────────────────────────────────

export default function Game() {
  const { state, actions } = useGameState();
  const [showLog, setShowLog] = useState(false);

  const handleCardClick = useCallback(
    (pos: Position) => {
      const pending = state.pendingChoice;

      // Pending choice takes priority over everything
      if (pending?.type === 'fairy_peek') {
        actions.fairyPeek(pos);
        return;
      }
      if (pending?.type === 'manipulation') {
        actions.manipulationTarget(pos);
        return;
      }

      // Normal flip
      actions.flipCard(pos);
    },
    [state.pendingChoice, actions],
  );

  const handleMagicSelect = useCallback(
    (card: MagicCard | null) => {
      if (!card) { actions.selectMagicCard(null); return; }
      // All magic cards auto-play immediately; pendingChoice system handles further input
      actions.playMagic(card);
      actions.selectMagicCard(null);
    },
    [actions],
  );

  // Merchant discard: clicking a hand card when pendingChoice === 'merchant_discard'
  const handleMerchantDiscard = useCallback(
    (card: MagicCard | null) => {
      if (!card) return;
      actions.merchantDiscard(card.id);
    },
    [actions],
  );

  const isHumanTurn = state.currentTurn === 'human';
  const flippedCount = state.grid.flat().filter(c => c.flipped).length;
  const totalCards = state.grid.flat().length;
  const pendingChoice = state.pendingChoice;
  const isMerchantDiscard = isHumanTurn && pendingChoice?.type === 'merchant_discard';

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-white overflow-hidden">

      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <header className="flex-none flex items-center gap-3 px-3 py-2 border-b border-slate-800 bg-slate-950/95 backdrop-blur z-10">
        {/* Title */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xl">👑</span>
          <h1 className="text-sm font-bold tracking-wide hidden md:block">Jeu de la Princesse</h1>
        </div>

        {/* Phase indicator (center, flexible) */}
        <div className="flex-1 min-w-0 flex items-center justify-center">
          <PhaseIndicator
            phase={state.phase}
            currentTurn={state.currentTurn}
            aiThinking={state.aiThinking}
            arrowActive={!!state.arrowConstraint}
            forcedFlip={!!state.forcedFlipTargets?.length}
            selectedMagicName={state.selectedMagicCard?.name ?? null}
            pendingChoice={pendingChoice?.type ?? null}
            onSkipBefore={actions.skipMagicBefore}
            onSkipAfter={actions.skipMagicAfter}
          />
        </div>

        {/* Right: players + controls */}
        <div className="flex items-center gap-2 shrink-0">
          <PlayerBar player={state.players.ai}    isActive={state.currentTurn === 'ai'}    isAI />
          <span className="text-slate-600 text-xs font-bold">VS</span>
          <PlayerBar player={state.players.human} isActive={state.currentTurn === 'human'} />
          {/* Log toggle */}
          <button
            onClick={() => setShowLog(v => !v)}
            className={`text-xs px-2 py-1.5 rounded-lg border transition-colors ${
              showLog ? 'border-indigo-500 text-indigo-300 bg-indigo-950/50' : 'border-slate-700 text-slate-500 hover:text-white'
            }`}
            title="Journal de jeu"
          >
            📜
          </button>
          <button
            onClick={actions.newGame}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
          >
            Nouvelle partie
          </button>
        </div>
      </header>

      {/* ── MAIN CONTENT ────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Grid area */}
        <main className="flex-1 flex items-center justify-center p-4 overflow-hidden">
          <div className="w-full" style={{ maxWidth: 'min(560px, calc(100vw - 2rem))' }}>
            {/* Progress bar */}
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${(flippedCount / totalCards) * 100}%` }}
                />
              </div>
              <span className="text-xs text-slate-500 shrink-0">
                {flippedCount}/{totalCards}
              </span>
              <span className="text-xs text-slate-500 shrink-0">
                🃏 {state.magicDeck.length}
              </span>
            </div>

            <GameBoard
              state={state}
              onCardClick={handleCardClick}
            />
          </div>
        </main>

        {/* Log sidebar */}
        {showLog && (
          <aside className="w-56 border-l border-slate-800 flex flex-col bg-slate-950/80 shrink-0">
            <div className="px-3 py-2 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Journal — Tour {state.turnNumber}
            </div>
            <div className="flex-1 overflow-hidden p-2">
              <GameLog entries={state.log} />
            </div>
          </aside>
        )}
      </div>

      {/* ── BOTTOM HAND ─────────────────────────────────────────────────────── */}
      <div className="flex-none h-36 border-t border-slate-800 bg-slate-900/60 relative">
        {/* Hand label + contextual hint */}
        <div className="absolute top-1.5 left-3 flex items-center gap-2 z-10">
          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
            {isHumanTurn ? `Votre main — ${state.players.human.hand.length} carte(s)` : 'Main de l\'IA'}
          </span>
          {/* Context hints */}
          {isMerchantDiscard && (
            <span className="text-xs text-amber-400 font-semibold animate-pulse">
              Cliquez une carte à défausser →
            </span>
          )}
          {/* Skip buttons */}
          {isHumanTurn && state.phase === 'play_magic_before' && !pendingChoice && (
            <button
              onClick={actions.skipMagicBefore}
              className="text-xs px-3 py-1 rounded-lg bg-indigo-700 hover:bg-indigo-600 text-white font-bold transition-colors"
            >
              Retourner une carte →
            </button>
          )}
          {isHumanTurn && state.phase === 'play_magic_after' && !pendingChoice && (
            <button
              onClick={actions.skipMagicAfter}
              className="text-xs px-3 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold transition-colors"
            >
              Passer →
            </button>
          )}
        </div>

        {isHumanTurn ? (
          <MagicHand
            hand={state.players.human.hand}
            phase={state.phase}
            selectedCard={state.selectedMagicCard}
            onSelect={isMerchantDiscard ? handleMerchantDiscard : handleMagicSelect}
            merchantDiscardMode={isMerchantDiscard}
            disabled={state.phase === 'game_over' || (!!pendingChoice && !isMerchantDiscard)}
          />
        ) : (
          <div className="h-full flex items-center justify-center gap-3 text-slate-600">
            {state.aiThinking && (
              <div className="flex items-center gap-2 animate-pulse">
                <span className="text-lg">🤖</span>
                <span className="text-sm">L&apos;IA réfléchit...</span>
                <div className="flex gap-1">
                  {[0,1,2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-indigo-500"
                      style={{ animationDelay: `${i * 0.2}s` }} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── CHOICE MODAL ────────────────────────────────────────────────────── */}
      {isHumanTurn && (pendingChoice?.type === 'goblin' || pendingChoice?.type === 'coup_decisif') && (
        <ChoiceModal
          type={pendingChoice.type}
          hasMagicCard={state.players.human.hand.length > 0}
          onGoblinChoose={actions.goblinChoose}
          onCoupDecisifChoose={actions.coupDecisifChoose}
        />
      )}

      {/* ── GAME OVER ───────────────────────────────────────────────────────── */}
      {state.phase === 'game_over' && state.winner && (
        <GameOverScreen winner={state.winner} onRestart={actions.newGame} />
      )}
    </div>
  );
}
