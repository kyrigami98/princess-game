'use client';

import { useCallback, useReducer, useEffect, useRef } from 'react';
import type { GameState, Position, MagicCard } from '@/lib/types';
import {
  createInitialState,
  flipCard,
  playMagicCard,
  skipMagicBefore,
  skipMagicAfter,
  endTurn,
  resolveGoblinChoice,
  resolveCoupDecisif,
  resolveFairyPeek,
  resolveMerchantDiscard,
  resolveManipulation,
} from '@/lib/gameLogic';
import {
  aiDecideMagicBefore,
  aiDecideMagicAfter,
  aiDecideFlip,
  aiPickManipulationTarget,
} from '@/lib/ai';

// ─── Actions ──────────────────────────────────────────────────────────────────

type Action =
  | { type: 'NEW_GAME' }
  | { type: 'FLIP_CARD'; position: Position }
  | { type: 'PLAY_MAGIC'; card: MagicCard }
  | { type: 'SKIP_MAGIC_BEFORE' }
  | { type: 'SKIP_MAGIC_AFTER' }
  | { type: 'SET_STATE'; state: GameState }
  | { type: 'SELECT_MAGIC'; card: MagicCard | null }
  | { type: 'AI_THINKING'; thinking: boolean }
  | { type: 'GOBLIN_CHOOSE'; choice: 'lose_life' | 'discard_magic' }
  | { type: 'COUP_DECISIF_CHOOSE'; choice: 'draw_magic' | 'gain_life' }
  | { type: 'FAIRY_PEEK'; position: Position }
  | { type: 'MERCHANT_DISCARD'; cardId: string }
  | { type: 'MANIPULATION_TARGET'; position: Position };

// ─── Reducer ──────────────────────────────────────────────────────────────────

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'NEW_GAME':
      return createInitialState();

    case 'FLIP_CARD': {
      if (state.phase !== 'flip_card' && state.phase !== 'arrow_follow') return state;
      if (state.currentTurn !== 'human') return state;
      return flipCard(state, action.position);
    }

    case 'PLAY_MAGIC': {
      if (state.currentTurn !== 'human') return state;
      if (state.pendingChoice !== null) return state;
      return playMagicCard(state, action.card);
    }

    case 'SKIP_MAGIC_BEFORE': {
      if (state.phase !== 'play_magic_before') return state;
      return skipMagicBefore(state);
    }

    case 'SKIP_MAGIC_AFTER': {
      if (state.phase !== 'play_magic_after') return state;
      return skipMagicAfter(state);
    }

    case 'SELECT_MAGIC':
      return { ...state, selectedMagicCard: action.card };

    case 'AI_THINKING':
      return { ...state, aiThinking: action.thinking };

    case 'SET_STATE':
      return action.state;

    case 'GOBLIN_CHOOSE':
      return resolveGoblinChoice(state, action.choice);

    case 'COUP_DECISIF_CHOOSE':
      return resolveCoupDecisif(state, action.choice);

    case 'FAIRY_PEEK':
      return resolveFairyPeek(state, action.position);

    case 'MERCHANT_DISCARD':
      return resolveMerchantDiscard(state, action.cardId);

    case 'MANIPULATION_TARGET':
      return resolveManipulation(state, action.position);

    default:
      return state;
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface GameActions {
  flipCard: (pos: Position) => void;
  playMagic: (card: MagicCard) => void;
  skipMagicBefore: () => void;
  skipMagicAfter: () => void;
  selectMagicCard: (card: MagicCard | null) => void;
  newGame: () => void;
  goblinChoose: (choice: 'lose_life' | 'discard_magic') => void;
  coupDecisifChoose: (choice: 'draw_magic' | 'gain_life') => void;
  fairyPeek: (pos: Position) => void;
  merchantDiscard: (cardId: string) => void;
  manipulationTarget: (pos: Position) => void;
}

export function useGameState(): { state: GameState; actions: GameActions } {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);
  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── AI Turn Automation ──────────────────────────────────────────────────

  const runAiTurn = useCallback((currentState: GameState) => {
    if (currentState.currentTurn !== 'ai') return;
    if (currentState.phase === 'game_over') return;
    if (currentState.phase === 'apply_effect') return;  // waiting for human choice
    if (currentState.pendingChoice !== null) return;     // human must act first

    dispatch({ type: 'AI_THINKING', thinking: true });

    // Phase: play magic before
    if (currentState.phase === 'play_magic_before') {
      aiTimerRef.current = setTimeout(() => {
        const decision = aiDecideMagicBefore(currentState);
        let next = currentState;

        if (decision.playMagic && decision.magicCard) {
          next = playMagicCard(next, decision.magicCard);
          // If concentration was played, the turn ended — dispatch and return
          if (next.currentTurn === 'human') {
            next = { ...next, aiThinking: false };
            dispatch({ type: 'SET_STATE', state: next });
            return;
          }
        }

        next = skipMagicBefore(next);
        next = { ...next, aiThinking: false };
        dispatch({ type: 'SET_STATE', state: next });
      }, 900);
      return;
    }

    // Phase: flip card or arrow follow
    if (currentState.phase === 'flip_card' || currentState.phase === 'arrow_follow') {
      aiTimerRef.current = setTimeout(() => {
        const pos = aiDecideFlip(currentState);
        let next = flipCard(currentState, pos);

        // If a pendingChoice was set (goblin while AI is actor), leave it for human to resolve
        if (next.pendingChoice !== null) {
          next = { ...next, aiThinking: false };
          dispatch({ type: 'SET_STATE', state: next });
          return;
        }

        next = { ...next, aiThinking: false };
        dispatch({ type: 'SET_STATE', state: next });
      }, 1200);
      return;
    }

    // Phase: play magic after
    if (currentState.phase === 'play_magic_after') {
      aiTimerRef.current = setTimeout(() => {
        const decision = aiDecideMagicAfter(currentState);
        let next = currentState;

        if (decision.playMagic && decision.magicCard) {
          next = playMagicCard(next, decision.magicCard);

          // If manipulation was played, AI auto-picks a target
          if (next.pendingChoice?.type === 'manipulation') {
            const target = aiPickManipulationTarget(next);
            next = resolveManipulation(next, target);
          }
        }

        next = skipMagicAfter(next);
        next = { ...next, aiThinking: false };
        dispatch({ type: 'SET_STATE', state: next });
      }, 800);
      return;
    }
  }, []);

  // Trigger AI whenever it becomes AI's turn or phase changes
  useEffect(() => {
    if (state.currentTurn === 'ai' && state.phase !== 'game_over' && state.pendingChoice === null) {
      runAiTurn(state);
    }

    return () => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentTurn, state.phase, state.turnNumber, state.pendingChoice]);

  // ─── Actions ──────────────────────────────────────────────────────────────

  const actions: GameActions = {
    flipCard: (pos) => dispatch({ type: 'FLIP_CARD', position: pos }),
    playMagic: (card) => dispatch({ type: 'PLAY_MAGIC', card }),
    skipMagicBefore: () => dispatch({ type: 'SKIP_MAGIC_BEFORE' }),
    skipMagicAfter: () => dispatch({ type: 'SKIP_MAGIC_AFTER' }),
    selectMagicCard: (card) => dispatch({ type: 'SELECT_MAGIC', card }),
    newGame: () => dispatch({ type: 'NEW_GAME' }),
    goblinChoose: (choice) => dispatch({ type: 'GOBLIN_CHOOSE', choice }),
    coupDecisifChoose: (choice) => dispatch({ type: 'COUP_DECISIF_CHOOSE', choice }),
    fairyPeek: (pos) => dispatch({ type: 'FAIRY_PEEK', position: pos }),
    merchantDiscard: (cardId) => dispatch({ type: 'MERCHANT_DISCARD', cardId }),
    manipulationTarget: (pos) => dispatch({ type: 'MANIPULATION_TARGET', position: pos }),
  };

  return { state, actions };
}
