import { getAllowedFlipTargets } from './gameLogic';
import type { GameState, MagicCard, Position } from './types';

function randomItem<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

function scoreCardForAi(state: GameState, pos: Position): number {
  const card = state.grid[pos.row][pos.col];

  const good = new Set([
    'healer',
    'regeneration',
    'worker',
    'scientist',
    'queen',
    'princess_proud',
    'princess_strict',
    'princess_oppressive',
    'princess_disappointed',
    'princess_curious',
    'princess_angry',
    'princess_attentive',
    'princess_ambitious',
    'yeti',
    'treant',
    'demon_josu',
    'knight_runu',
    'giant',
    'proud_knight',
  ]);

  const bad = new Set(['death', 'burn', 'ifrit', 'electrocution', 'siren', 'succubus']);

  if (card.peekedBy === 'ai') {
    if (good.has(card.effect)) return 10;
    if (bad.has(card.effect)) return -10;
  }

  if (card.effect === 'death') return -100;
  if (card.effect === 'lightning' || card.effect === 'fireball' || card.effect === 'atlante') return 4;
  return 0;
}

export interface AIDecision {
  playMagic: boolean;
  magicCard?: MagicCard;
}

export function aiDecideMagicBefore(state: GameState): AIDecision {
  const ai = state.players.ai;
  const hand = ai.hand.filter((card) => card.timing === 'before' || card.timing === 'counter');

  if (!ai.counterMagicActive) {
    const counter = hand.find((card) => card.effect === 'counter_magic');
    if (counter && state.players.human.hand.length >= 2 && Math.random() < 0.45) {
      return { playMagic: true, magicCard: counter };
    }
  }

  if (!ai.immuneCharacterEffect) {
    const immunity = hand.find((card) => card.effect === 'immunity');
    if (immunity && Math.random() < 0.22) return { playMagic: true, magicCard: immunity };
  }

  if (!ai.immuneNextSingleLifeLoss && ai.lives <= 2) {
    const barrier = hand.find((card) => card.effect === 'barrier');
    if (barrier) return { playMagic: true, magicCard: barrier };
  }

  const choiceOfSoul = hand.find((card) => card.effect === 'choice_of_soul');
  if (choiceOfSoul && (ai.lives <= 2 || ai.hand.length <= 1) && Math.random() < 0.7) {
    return { playMagic: true, magicCard: choiceOfSoul };
  }

  return { playMagic: false };
}

export function aiDecideMagicAfter(state: GameState): AIDecision {
  const ai = state.players.ai;
  const hand = ai.hand.filter((card) => card.timing === 'after' || card.timing === 'counter');

  const restriction = hand.find((card) => card.effect === 'restriction');
  if (restriction && Math.random() < 0.5) return { playMagic: true, magicCard: restriction };

  const manipulation = hand.find((card) => card.effect === 'manipulation');
  if (manipulation && getAllowedFlipTargets({ ...state, currentTurn: 'human' }).length > 0 && Math.random() < 0.6) {
    return { playMagic: true, magicCard: manipulation };
  }

  const concentration = hand.find((card) => card.effect === 'concentration');
  if (concentration && ai.lives <= 1 && Math.random() < 0.5) return { playMagic: true, magicCard: concentration };

  const barrier = hand.find((card) => card.effect === 'barrier');
  if (barrier && ai.lives <= 2 && !ai.immuneNextSingleLifeLoss && Math.random() < 0.4) {
    return { playMagic: true, magicCard: barrier };
  }

  return { playMagic: false };
}

export function aiDecideFlip(state: GameState): Position {
  const allowed = getAllowedFlipTargets(state);
  if (allowed.length === 0) {
    const fallback = state.grid.flat().find((card) => !card.flipped);
    if (!fallback) return { row: 0, col: 0 };
    return fallback.position;
  }

  const scored = allowed
    .map((pos) => ({ pos, score: scoreCardForAi(state, pos) + Math.random() * 0.2 }))
    .sort((a, b) => b.score - a.score);

  return scored[0].pos;
}

export function aiPickManipulationTarget(state: GameState): Position {
  const candidateState = { ...state, currentTurn: 'human' as const };
  const targets = getAllowedFlipTargets(candidateState);
  if (targets.length === 0) {
    const fallback = state.grid.flat().find((card) => !card.flipped);
    return fallback ? fallback.position : { row: 0, col: 0 };
  }

  const scored = targets
    .map((pos) => ({ pos, score: -scoreCardForAi(state, pos) + Math.random() * 0.25 }))
    .sort((a, b) => b.score - a.score);

  return scored[0]?.pos ?? randomItem(targets);
}
