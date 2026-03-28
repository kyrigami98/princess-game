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
  resolveDiscardSpecific,
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
  | { type: 'RESOLVE_DISCARD_SPECIFIC'; cardId: string }
  | { type: 'RESOLVE_COUNTER'; counterCardId?: string }
  | { type: 'FORCE_END_TURN' };

/** Actions that are purely local UI state — never pushed to Supabase. */
const LOCAL_ONLY_ACTIONS = new Set<Action['type']>(['SELECT_MAGIC']);

function reducer(state: GameState, action: Action): GameState {
  let next: GameState;
  switch (action.type) {
    case 'NEW_GAME':
      return createInitialState();
    case 'SET_STATE':
      return action.state;
    case 'SELECT_MAGIC':
      // Local-only: no stateVersion bump, no Supabase push.
      return { ...state, selectedMagicCard: action.card };
    // Guards removed: gameLogic validates turns; UI prevents wrong-turn actions
    case 'FLIP_CARD':
      next = flipCard(state, action.position); break;
    case 'PLAY_MAGIC':
      next = playMagicCard(state, action.card); break;
    case 'SKIP_BEFORE':
      next = skipMagicBefore(state); break;
    case 'SKIP_AFTER':
      next = skipMagicAfter(state); break;
    case 'RESOLVE_GOBLIN':
      next = resolveGoblinChoice(state, action.choice); break;
    case 'RESOLVE_SOUL':
      next = resolveChoiceOfSoul(state, action.choice); break;
    case 'RESOLVE_FAIRY':
      next = resolveFairyPeek(state, action.position); break;
    case 'RESOLVE_MANIPULATION':
      next = resolveManipulation(state, action.position); break;
    case 'RESOLVE_DISCARD_ANY':
      next = resolveDiscardAnyChoice(state, action.choice); break;
    case 'RESOLVE_DISCARD_SPECIFIC':
      next = resolveDiscardSpecific(state, action.cardId); break;
    case 'RESOLVE_COUNTER':
      next = resolveCounterWindow(state, action.counterCardId); break;
    case 'FORCE_END_TURN':
      next = endTurn(state); break;
    default:
      return state;
  }
  // Bump version on every real state transition so the stale-update guard
  // in useMultiplayer works within a single turn (same turnNumber).
  return next === state ? state : { ...next, stateVersion: (state.stateVersion ?? 0) + 1 };
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
  discardSpecificCard: (cardId: string) => void;
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
  // Track the last state received from Supabase to avoid pushing it back
  const lastExternalStateRef = useRef<GameState | null>(null);
  // Track whether the last dispatch was a local-only action (no push needed)
  const lastActionRef = useRef<Action['type'] | null>(null);

  // ── Sync external state from Supabase ────────────────────────────────────
  useEffect(() => {
    if (!externalState) return;
    lastExternalStateRef.current = externalState;
    lastActionRef.current = 'SET_STATE';
    dispatch({ type: 'SET_STATE', state: externalState });
  }, [externalState]);

  // ── Push local state changes to Supabase ─────────────────────────────────
  useEffect(() => {
    if (!onStateChange) return;
    if (state === prevStateRef.current) return;
    prevStateRef.current = state;

    // Don't push back state that arrived from the server
    if (state === lastExternalStateRef.current) return;

    // Don't push local-only UI actions (e.g. card selection in hand)
    if (lastActionRef.current && LOCAL_ONLY_ACTIONS.has(lastActionRef.current)) return;

    onStateChange(state);
  }, [onStateChange, state]);

  function act(action: Action) {
    lastActionRef.current = action.type;
    dispatch(action);
  }

  const actions: GameActions = {
    newGame: () => act({ type: 'NEW_GAME' }),
    selectMagicCard: (card) => act({ type: 'SELECT_MAGIC', card }),
    playMagic: (card) => act({ type: 'PLAY_MAGIC', card }),
    flipCard: (position) => act({ type: 'FLIP_CARD', position }),
    skipMagicBefore: () => act({ type: 'SKIP_BEFORE' }),
    skipMagicAfter: () => act({ type: 'SKIP_AFTER' }),
    goblinChoose: (choice) => act({ type: 'RESOLVE_GOBLIN', choice }),
    choiceOfSoulChoose: (choice) => act({ type: 'RESOLVE_SOUL', choice }),
    fairyPeek: (position) => act({ type: 'RESOLVE_FAIRY', position }),
    manipulationTarget: (position) => act({ type: 'RESOLVE_MANIPULATION', position }),
    discardAnyChoose: (choice) => act({ type: 'RESOLVE_DISCARD_ANY', choice }),
    discardSpecificCard: (cardId) => act({ type: 'RESOLVE_DISCARD_SPECIFIC', cardId }),
    resolveCounter: (counterCardId) => act({ type: 'RESOLVE_COUNTER', counterCardId }),
  };

  return { state, actions };
}
