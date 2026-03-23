import type { GameState, MagicCard, Position } from './types';
import { getAdjacentPositions } from './cards';

// ─── Utilities ────────────────────────────────────────────────────────────────

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function unflippedPositions(state: GameState): Position[] {
  return state.grid.flat().filter(c => !c.flipped).map(c => c.position);
}

// Cards that are good (or neutral) for the AI to flip
function safeKnownPositions(state: GameState): Position[] {
  const safeEffects = new Set([
    'villager', 'healer', 'mage', 'regeneration', 'friend', 'fairy',
    'lightning', 'fireball',          // good: hurt opponent
    'princess', 'queen',              // force opponent to flip
  ]);
  return state.grid.flat()
    .filter(c => !c.flipped && c.peekedBy === 'ai' && safeEffects.has(c.effect))
    .map(c => c.position);
}

// Cards that are bad for the AI to flip
function dangerousKnownPositions(state: GameState): Position[] {
  const dangerousEffects = new Set(['burn', 'electrocution', 'vampire', 'goblin', 'gravedigger']);
  return state.grid.flat()
    .filter(c => !c.flipped && c.peekedBy === 'ai' && dangerousEffects.has(c.effect))
    .map(c => c.position);
}

function positionEquals(a: Position, b: Position): boolean {
  return a.row === b.row && a.col === b.col;
}

function positionIn(pos: Position, list: Position[]): boolean {
  return list.some(p => positionEquals(p, pos));
}

// ─── Magic Decision ───────────────────────────────────────────────────────────

export interface AIDecision {
  playMagic: boolean;
  magicCard?: MagicCard;
}

export function aiDecideMagicBefore(state: GameState): AIDecision {
  const ai = state.players.ai;
  const hand = ai.hand.filter(c => c.timing === 'before' || c.timing === 'both');

  // Low health: try to gain life or protect
  if (ai.lives <= 2) {
    const coupDecisif = hand.find(c => c.effect === 'coup_decisif');
    if (coupDecisif && Math.random() < 0.7) return { playMagic: true, magicCard: coupDecisif };

    const barriere = hand.find(c => c.effect === 'barriere');
    if (barriere && !ai.shielded) return { playMagic: true, magicCard: barriere };
  }

  // Use contre_magie proactively if opponent has multiple cards
  const contreMagie = hand.find(c => c.effect === 'contre_magie');
  if (contreMagie && !ai.counterMagicActive && state.players.human.hand.length >= 2 && Math.random() < 0.35) {
    return { playMagic: true, magicCard: contreMagie };
  }

  // Annulation before flipping (immune to next card effect)
  const annulation = hand.find(c => c.effect === 'annulation');
  if (annulation && !ai.nullifyNext && Math.random() < 0.25) {
    return { playMagic: true, magicCard: annulation };
  }

  // Skip own turn (concentration) only if all remaining cards seem dangerous
  const dangerous = dangerousKnownPositions(state);
  const unflipped = unflippedPositions(state);
  const concentration = hand.find(c => c.effect === 'concentration');
  if (concentration && dangerous.length > 0 && dangerous.length >= unflipped.length * 0.6 && Math.random() < 0.4) {
    return { playMagic: true, magicCard: concentration };
  }

  return { playMagic: false };
}

export function aiDecideMagicAfter(state: GameState): AIDecision {
  const ai = state.players.ai;
  const hand = ai.hand.filter(c => c.timing === 'after' || c.timing === 'both');

  // Restriction: make opponent skip next turn (aggressive play)
  const restriction = hand.find(c => c.effect === 'restriction');
  if (restriction && Math.random() < 0.55) return { playMagic: true, magicCard: restriction };

  // Coup décisif: gain life if needed
  const coupDecisif = hand.find(c => c.effect === 'coup_decisif');
  if (coupDecisif && ai.lives <= 2 && Math.random() < 0.8) {
    return { playMagic: true, magicCard: coupDecisif };
  }

  // Manipulation: designate a card for opponent to flip next turn
  const manipulation = hand.find(c => c.effect === 'manipulation');
  if (manipulation && unflippedPositions(state).length > 0 && Math.random() < 0.5) {
    return { playMagic: true, magicCard: manipulation };
  }

  // Barriere if low on health and not already shielded
  const barriere = hand.find(c => c.effect === 'barriere');
  if (barriere && !ai.shielded && ai.lives <= 2 && Math.random() < 0.7) {
    return { playMagic: true, magicCard: barriere };
  }

  return { playMagic: false };
}

// ─── Flip Decision ────────────────────────────────────────────────────────────

export function aiDecideFlip(state: GameState): Position {
  const unflipped = unflippedPositions(state);
  const safe = safeKnownPositions(state);
  const dangerous = dangerousKnownPositions(state);

  // Arrow constraint (princess)
  if (state.arrowConstraint) {
    const targets = state.arrowConstraint.targets.filter(p => !state.grid[p.row][p.col].flipped);
    if (targets.length > 0) {
      const safeForcedTarget = targets.find(p => positionIn(p, safe));
      if (safeForcedTarget) return safeForcedTarget;
      const nonDangerous = targets.filter(p => !positionIn(p, dangerous));
      return randomItem(nonDangerous.length > 0 ? nonDangerous : targets);
    }
  }

  // Queen forced queue
  if (state.queenForcedQueue && state.queenForcedQueue.length > 0) {
    const targets = state.queenForcedQueue.filter(p => !state.grid[p.row][p.col].flipped);
    if (targets.length > 0) {
      const safeForcedTarget = targets.find(p => positionIn(p, safe));
      if (safeForcedTarget) return safeForcedTarget;
      const nonDangerous = targets.filter(p => !positionIn(p, dangerous));
      return randomItem(nonDangerous.length > 0 ? nonDangerous : targets);
    }
  }

  // Forced flip from manipulation magic
  if (state.forcedFlipTargets && state.forcedFlipTargets.length > 0) {
    return state.forcedFlipTargets[0];
  }

  // Prefer known safe positions
  if (safe.length > 0) return randomItem(safe);

  // Filter out known dangerous positions
  const safeUnknown = unflipped.filter(p => !positionIn(p, dangerous));
  if (safeUnknown.length > 0) {
    const scored = safeUnknown.map(pos => {
      const adj = getAdjacentPositions(pos, state.grid);
      const dangerNeighbors = adj.filter(p => positionIn(p, dangerous)).length;
      return { pos, score: dangerNeighbors };
    });
    scored.sort((a, b) => a.score - b.score);
    return randomItem(scored.slice(0, Math.min(3, scored.length))).pos;
  }

  return randomItem(unflipped);
}

// ─── AI auto-resolve manipulation target ─────────────────────────────────────

export function aiPickManipulationTarget(state: GameState): Position {
  const unflipped = unflippedPositions(state);
  // Prefer cards that are dangerous for the human (good for AI)
  const dangerousForHuman = new Set(['burn', 'electrocution', 'vampire', 'goblin', 'gravedigger', 'lightning']);
  const knownDangerous = unflipped.filter(p => {
    const card = state.grid[p.row][p.col];
    return card.peekedBy === 'ai' && dangerousForHuman.has(card.effect);
  });
  if (knownDangerous.length > 0) return randomItem(knownDangerous);
  return randomItem(unflipped);
}
