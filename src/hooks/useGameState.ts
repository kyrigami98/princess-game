'use client';

import { useEffect, useReducer, useRef } from 'react';
import type { GameState, MagicCard, Position } from '@/lib/types';
import {
  createInitialState,
  endTurn,
  flipCard,
  playMagicCard,
  resolveChoiceOfSoul,
  resolveCounterWindow,
  resolveDiscardAnyChoice,
  resolveFairyPeek,
  resolveGoblinChoice,
  resolveManipulation,
  skipMagicAfter,
  skipMagicBefore,
} from '@/lib/gameLogic';


type Action =
  | { type: 'NEW_GAME' }
  | { type: 'SET_STATE'; state: GameState }
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
  | { type: 'RESOLVE_COUNTER'; counterCardId?: string }
  | { type: 'FORCE_END_TURN' };

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'NEW_GAME':
      return createInitialState();
    case 'SET_STATE':
      return action.state;
    case 'SELECT_MAGIC':
      return { ...state, selectedMagicCard: action.card };
    // Guards removed: gameLogic validates turns; UI prevents wrong-turn actions
    case 'FLIP_CARD':
      return flipCard(state, action.position);
    case 'PLAY_MAGIC':
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
    case 'RESOLVE_COUNTER':
      return resolveCounterWindow(state, action.counterCardId);
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
  resolveCounter: (counterCardId?: string) => void;
}

export interface GameStateConfig {
  /** Initial state for multiplayer (loaded from Supabase) */
  initialState?: GameState;
  /** Latest external state from Supabase realtime */
  externalState?: GameState | null;
  /** Called after each local state change so multiplayer can push to Supabase */
  onStateChange?: (state: GameState) => Promise<void>;
}

export function useGameState(config: GameStateConfig = {}): { state: GameState; actions: GameActions } {
  const { initialState, externalState, onStateChange } = config;

  const [state, dispatch] = useReducer(
    reducer,
    undefined,
    () => initialState ?? createInitialState(),
  );

  const prevStateRef = useRef(state);
  // Flag to suppress push when the state change came from external (Supabase) update
  const applyingExternalRef = useRef(false);

  // ── Sync external state from Supabase ────────────────────────────────────
  useEffect(() => {
    if (!externalState) return;
    applyingExternalRef.current = true;
    dispatch({ type: 'SET_STATE', state: externalState });
  }, [externalState]);

  // ── Push local state changes to Supabase ─────────────────────────────────
  useEffect(() => {
    if (!onStateChange) return;
    if (state === prevStateRef.current) return;
    prevStateRef.current = state;

    if (applyingExternalRef.current) {
      applyingExternalRef.current = false;
      return;
    }

    onStateChange(state);
  }, [onStateChange, state]);

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
    resolveCounter: (counterCardId) => dispatch({ type: 'RESOLVE_COUNTER', counterCardId }),
  };

  return { state, actions };
}
