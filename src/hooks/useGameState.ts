'use client';

import { useCallback, useEffect, useReducer, useRef } from 'react';
import type { GameState, MagicCard, Position } from '@/lib/types';
import {
  createInitialState,
  endTurn,
  flipCard,
  playMagicCard,
  resolveChoiceOfSoul,
  resolveDiscardAnyChoice,
  resolveFairyPeek,
  resolveGoblinChoice,
  resolveManipulation,
  skipMagicAfter,
  skipMagicBefore,
} from '@/lib/gameLogic';
import { aiDecideFlip, aiDecideMagicAfter, aiDecideMagicBefore, aiPickManipulationTarget } from '@/lib/ai';

type Action =
  | { type: 'NEW_GAME' }
  | { type: 'SET_STATE'; state: GameState }
  | { type: 'AI_THINKING'; thinking: boolean }
  | { type: 'SELECT_MAGIC'; card: MagicCard | null }
  | { type: 'FLIP_CARD'; position: Position }
  | { type: 'PLAY_MAGIC'; card: MagicCard }
  | { type: 'SKIP_BEFORE' }
  | { type: 'SKIP_AFTER' }
  | { type: 'RESOLVE_GOBLIN'; choice: 'lose_life' | 'discard_magic' }
  | { type: 'RESOLVE_SOUL'; choice: 'draw_magic' | 'gain_life' }
  | { type: 'RESOLVE_FAIRY'; position: Position }
  | { type: 'RESOLVE_MANIPULATION'; position: Position }
  | { type: 'RESOLVE_DISCARD_ANY'; choice: 'lose_life' | 'discard_magic' }
  | { type: 'FORCE_END_TURN' };

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'NEW_GAME':
      return createInitialState();
    case 'SET_STATE':
      return action.state;
    case 'AI_THINKING':
      return { ...state, aiThinking: action.thinking };
    case 'SELECT_MAGIC':
      return { ...state, selectedMagicCard: action.card };
    case 'FLIP_CARD':
      if (state.currentTurn !== 'human') return state;
      return flipCard(state, action.position);
    case 'PLAY_MAGIC':
      if (state.currentTurn !== 'human') return state;
      return playMagicCard(state, action.card);
    case 'SKIP_BEFORE':
      return skipMagicBefore(state);
    case 'SKIP_AFTER':
      return skipMagicAfter(state);
    case 'RESOLVE_GOBLIN':
      return resolveGoblinChoice(state, action.choice);
    case 'RESOLVE_SOUL':
      return resolveChoiceOfSoul(state, action.choice);
    case 'RESOLVE_FAIRY':
      return resolveFairyPeek(state, action.position);
    case 'RESOLVE_MANIPULATION':
      return resolveManipulation(state, action.position);
    case 'RESOLVE_DISCARD_ANY':
      return resolveDiscardAnyChoice(state, action.choice);
    case 'FORCE_END_TURN':
      return endTurn(state);
    default:
      return state;
  }
}

export interface GameActions {
  newGame: () => void;
  selectMagicCard: (card: MagicCard | null) => void;
  playMagic: (card: MagicCard) => void;
  flipCard: (position: Position) => void;
  skipMagicBefore: () => void;
  skipMagicAfter: () => void;
  goblinChoose: (choice: 'lose_life' | 'discard_magic') => void;
  choiceOfSoulChoose: (choice: 'draw_magic' | 'gain_life') => void;
  fairyPeek: (position: Position) => void;
  manipulationTarget: (position: Position) => void;
  discardAnyChoose: (choice: 'lose_life' | 'discard_magic') => void;
}

export function useGameState(): { state: GameState; actions: GameActions } {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState);
  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aiRunningRef = useRef(false);

  const runAiTurn = useCallback((currentState: GameState) => {
    if (currentState.currentTurn !== 'ai' || currentState.phase === 'game_over') return;
    if (currentState.pendingChoice) return;
    if (aiRunningRef.current) return;

    aiRunningRef.current = true;

    if (currentState.phase === 'play_magic_before') {
      aiTimerRef.current = setTimeout(() => {
        let next = currentState;
        const decision = aiDecideMagicBefore(next);
        if (decision.playMagic && decision.magicCard) next = playMagicCard(next, decision.magicCard);
        next = skipMagicBefore(next);
        aiRunningRef.current = false;
        dispatch({ type: 'SET_STATE', state: { ...next, aiThinking: false } });
      }, 600);
      return;
    }

    if (currentState.phase === 'flip_card' || currentState.phase === 'arrow_follow') {
      aiTimerRef.current = setTimeout(() => {
        const pos = aiDecideFlip(currentState);
        let next = flipCard(currentState, pos);

        if (next.pendingChoice?.type === 'manipulation' && next.pendingChoice.playerId === 'ai') {
          next = resolveManipulation(next, aiPickManipulationTarget(next));
        }

        aiRunningRef.current = false;
        dispatch({ type: 'SET_STATE', state: { ...next, aiThinking: false } });
      }, 900);
      return;
    }

    if (currentState.phase === 'play_magic_after') {
      aiTimerRef.current = setTimeout(() => {
        let next = currentState;
        const decision = aiDecideMagicAfter(next);
        if (decision.playMagic && decision.magicCard) next = playMagicCard(next, decision.magicCard);

        if (next.pendingChoice?.type === 'manipulation' && next.pendingChoice.playerId === 'ai') {
          next = resolveManipulation(next, aiPickManipulationTarget(next));
        }

        next = skipMagicAfter(next);
        aiRunningRef.current = false;
        dispatch({ type: 'SET_STATE', state: { ...next, aiThinking: false } });
      }, 550);
      return;
    }

    aiRunningRef.current = false;
  }, []);

  useEffect(() => {
    if (state.currentTurn === 'ai' && state.phase !== 'game_over' && !state.pendingChoice) {
      runAiTurn(state);
    }

    return () => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
      aiRunningRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.currentTurn, state.phase, state.turnNumber, state.pendingChoice, runAiTurn]);

  const actions: GameActions = {
    newGame: () => dispatch({ type: 'NEW_GAME' }),
    selectMagicCard: (card) => dispatch({ type: 'SELECT_MAGIC', card }),
    playMagic: (card) => dispatch({ type: 'PLAY_MAGIC', card }),
    flipCard: (position) => dispatch({ type: 'FLIP_CARD', position }),
    skipMagicBefore: () => dispatch({ type: 'SKIP_BEFORE' }),
    skipMagicAfter: () => dispatch({ type: 'SKIP_AFTER' }),
    goblinChoose: (choice) => dispatch({ type: 'RESOLVE_GOBLIN', choice }),
    choiceOfSoulChoose: (choice) => dispatch({ type: 'RESOLVE_SOUL', choice }),
    fairyPeek: (position) => dispatch({ type: 'RESOLVE_FAIRY', position }),
    manipulationTarget: (position) => dispatch({ type: 'RESOLVE_MANIPULATION', position }),
    discardAnyChoose: (choice) => dispatch({ type: 'RESOLVE_DISCARD_ANY', choice }),
  };

  return { state, actions };
}
