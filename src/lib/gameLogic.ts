import { buildGrid, buildMagicDeck, getArrowTargets, positionKey, samePosition, shuffle } from './cards';
import type {
  CardPolarity,
  GameState,
  GridCard,
  GridCardEffect,
  LogEntry,
  MagicCard,
  Player,
  PlayerID,
  Position,
} from './types';

const STARTING_LIVES = 3;
const STARTING_HAND = 2;
const STARTING_LIFE_DECK = 10;

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function opp(playerId: PlayerID): PlayerID {
  return playerId === 'human' ? 'ai' : 'human';
}

function addLog(
  state: GameState,
  message: string,
  type: LogEntry['type'] = 'info',
  player: PlayerID | 'system' = state.currentTurn,
): GameState {
  return {
    ...state,
    log: [...state.log, { id: uid(), turn: state.turnNumber, player, message, type }],
  };
}

function setPlayer(state: GameState, player: Player): GameState {
  return { ...state, players: { ...state.players, [player.id]: player } };
}

function setGridCard(state: GameState, card: GridCard): GameState {
  return {
    ...state,
    grid: state.grid.map((row) => row.map((current) => (current.id === card.id ? card : current))),
  };
}

function makePlayer(id: PlayerID, name: string, hand: MagicCard[]): Player {
  return {
    id,
    name,
    lives: STARTING_LIVES,
    hand,
    discardPile: [],
    skipNextTurn: false,
    counterMagicActive: false,
    immuneCharacterEffect: false,
    immuneNextMagic: false,
    immuneNextSpell: false,
    immuneNextNegativeCharacter: false,
    immuneNextPositiveCharacter: false,
    immuneNextLifeLoss: false,
    immuneNextSingleLifeLoss: false,
    playedMagicThisTurn: false,
  };
}

export function createInitialState(): GameState {
  const magicDeck = buildMagicDeck();
  return {
    grid: buildGrid(),
    players: {
      human: makePlayer('human', 'Vous', magicDeck.splice(0, STARTING_HAND)),
      ai: makePlayer('ai', 'IA', magicDeck.splice(0, STARTING_HAND)),
    },
    currentTurn: 'human',
    phase: 'play_magic_before',
    turnNumber: 1,
    arrowConstraint: null,
    queenForcedQueue: null,
    queenForcedFor: null,
    kingLockedTargets: [],
    forcedFlipTargets: null,
    forcedFlipFor: null,
    pendingChoice: null,
    selectedMagicCard: null,
    lastFlippedCard: null,
    winner: null,
    aiThinking: false,
    log: [
      {
        id: uid(),
        turn: 0,
        player: 'system',
        type: 'info',
        message: 'La partie commence. Respectez la magie… et évitez LA MORT.',
      },
    ],
    magicDeck,
    lifeDeck: Math.max(0, STARTING_LIFE_DECK - STARTING_LIVES * 2),
  };
}

function drawMagic(state: GameState, playerId: PlayerID, amount = 1): GameState {
  if (amount <= 0 || state.magicDeck.length === 0) return state;
  const deck = [...state.magicDeck];
  const drawn = deck.splice(0, amount);
  const player = state.players[playerId];
  return {
    ...setPlayer(state, { ...player, hand: [...player.hand, ...drawn] }),
    magicDeck: deck,
  };
}

function drawLife(state: GameState, playerId: PlayerID, amount = 1): GameState {
  if (amount <= 0 || state.lifeDeck <= 0) return state;
  const drawCount = Math.min(amount, state.lifeDeck);
  const player = state.players[playerId];
  return {
    ...setPlayer(state, { ...player, lives: player.lives + drawCount }),
    lifeDeck: state.lifeDeck - drawCount,
  };
}

function discardRandomMagic(state: GameState, playerId: PlayerID, amount = 1): GameState {
  let next = state;
  for (let i = 0; i < amount; i++) {
    const player = next.players[playerId];
    if (player.hand.length === 0) return next;
    const index = Math.floor(Math.random() * player.hand.length);
    const discarded = player.hand[index];
    const hand = player.hand.filter((_, cardIndex) => cardIndex !== index);
    next = setPlayer(next, { ...player, hand, discardPile: [...player.discardPile, discarded] });
  }
  return next;
}

function transferRandomMagic(state: GameState, from: PlayerID, to: PlayerID): GameState {
  const source = state.players[from];
  if (source.hand.length === 0) return state;
  const index = Math.floor(Math.random() * source.hand.length);
  const card = source.hand[index];
  const nextSource = { ...source, hand: source.hand.filter((c) => c.id !== card.id) };
  const target = state.players[to];
  const nextTarget = { ...target, hand: [...target.hand, card] };
  return setPlayer(setPlayer(state, nextSource), nextTarget);
}

function completeResolution(state: GameState): GameState {
  if (state.phase === 'game_over' || state.pendingChoice) return state;
  return { ...state, phase: 'play_magic_after' };
}

function consumeProtection(
  state: GameState,
  playerId: PlayerID,
  key: keyof Pick<
    Player,
    | 'immuneCharacterEffect'
    | 'immuneNextMagic'
    | 'immuneNextSpell'
    | 'immuneNextNegativeCharacter'
    | 'immuneNextPositiveCharacter'
    | 'immuneNextLifeLoss'
    | 'immuneNextSingleLifeLoss'
  >,
  message: string,
): GameState {
  const player = state.players[playerId];
  if (!player[key]) return state;
  const updated = { ...player, [key]: false };
  return addLog(setPlayer(state, updated), message, 'success', 'system');
}

function applyLifeLoss(state: GameState, playerId: PlayerID, amount: number, source: 'character' | 'spell' | 'magic'): GameState {
  if (amount <= 0 || state.phase === 'game_over') return state;
  let next = state;
  const player = next.players[playerId];

  if (player.immuneNextLifeLoss) {
    return consumeProtection(next, playerId, 'immuneNextLifeLoss', `🛡️ ${player.name} annule la prochaine perte de vie.`);
  }

  if (amount === 1 && player.immuneNextSingleLifeLoss) {
    return consumeProtection(next, playerId, 'immuneNextSingleLifeLoss', `🛡️ ${player.name} annule cette perte de 1 vie.`);
  }

  const updatedLives = Math.max(0, player.lives - amount);
  next = setPlayer(next, { ...player, lives: updatedLives });
  next = addLog(next, `-${amount} vie pour ${player.name}.`, 'danger', 'system');

  if (updatedLives <= 0) {
    return {
      ...addLog(next, `${player.name} est éliminé${source === 'spell' ? ' par un sort' : ''}.`, 'danger', 'system'),
      phase: 'game_over',
      winner: opp(playerId),
    };
  }

  return next;
}

function drawDefaultCard(state: GameState, playerId: PlayerID): GameState {
  const player = state.players[playerId];
  if (player.lives <= 2 && state.lifeDeck > 0) return drawLife(state, playerId, 1);
  if (state.magicDeck.length > 0) return drawMagic(state, playerId, 1);
  return drawLife(state, playerId, 1);
}

function uniquePositions(positions: Position[]): Position[] {
  const seen = new Set<string>();
  const out: Position[] = [];
  positions.forEach((pos) => {
    const key = positionKey(pos);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(pos);
    }
  });
  return out;
}

function getForcedTargetsForCurrent(state: GameState): Position[] {
  if (state.queenForcedFor === state.currentTurn && state.queenForcedQueue?.length) {
    return state.queenForcedQueue.filter((pos) => !state.grid[pos.row][pos.col].flipped);
  }
  if (state.forcedFlipFor === state.currentTurn && state.forcedFlipTargets?.length) {
    return state.forcedFlipTargets.filter((pos) => !state.grid[pos.row][pos.col].flipped);
  }
  if (state.arrowConstraint && state.arrowConstraint.forcedFor === state.currentTurn) {
    return state.arrowConstraint.targets.filter((pos) => !state.grid[pos.row][pos.col].flipped);
  }
  return [];
}

export function getAllowedFlipTargets(state: GameState): Position[] {
  if (state.phase !== 'flip_card' && state.phase !== 'arrow_follow') return [];
  if (state.pendingChoice) return [];

  const forced = getForcedTargetsForCurrent(state);
  if (forced.length > 0) return forced;

  const unflipped = state.grid.flat().filter((card) => !card.flipped).map((card) => card.position);
  if (unflipped.length === 0) return [];

  const lockKeys = new Set(state.kingLockedTargets.map((pos) => positionKey(pos)));
  const unlocked = unflipped.filter((pos) => !lockKeys.has(positionKey(pos)));
  if (unlocked.length > 0) return unlocked;

  return unflipped;
}

function clearConsumedForcedConstraints(state: GameState, position: Position): GameState {
  let next = state;

  if (next.arrowConstraint && next.arrowConstraint.forcedFor === next.currentTurn) {
    const remains = next.arrowConstraint.targets.filter((target) => !samePosition(target, position));
    next = { ...next, arrowConstraint: remains.length > 0 ? { ...next.arrowConstraint, targets: remains } : null };
  }

  if (next.forcedFlipFor === next.currentTurn && next.forcedFlipTargets) {
    const remains = next.forcedFlipTargets.filter((target) => !samePosition(target, position));
    next = {
      ...next,
      forcedFlipTargets: remains.length > 0 ? remains : null,
      forcedFlipFor: remains.length > 0 ? next.forcedFlipFor : null,
    };
  }

  if (next.queenForcedFor === next.currentTurn && next.queenForcedQueue) {
    const remains = next.queenForcedQueue.filter((target) => !samePosition(target, position));
    next = {
      ...next,
      queenForcedQueue: remains.length > 0 ? remains : null,
      queenForcedFor: remains.length > 0 ? next.queenForcedFor : null,
    };
  }

  return next;
}

function revealCard(state: GameState, card: GridCard): GameState {
  const flipped = { ...card, flipped: true, peeked: false, peekedBy: null };
  return setGridCard(state, flipped);
}

function shouldIgnoreCharacterEffect(state: GameState, targetId: PlayerID, polarity: CardPolarity | null): GameState | null {
  const player = state.players[targetId];

  if (player.immuneCharacterEffect) {
    return consumeProtection(state, targetId, 'immuneCharacterEffect', `✴️ ${player.name} annule un effet de PERSONNAGE.`);
  }
  if (polarity === 'negative' && player.immuneNextNegativeCharacter) {
    return consumeProtection(state, targetId, 'immuneNextNegativeCharacter', `🛡️ ${player.name} annule un effet négatif de PERSONNAGE.`);
  }
  if (polarity === 'positive' && player.immuneNextPositiveCharacter) {
    return consumeProtection(state, targetId, 'immuneNextPositiveCharacter', `🛡️ ${player.name} annule un effet positif de PERSONNAGE.`);
  }

  return null;
}

function shouldIgnoreSpellEffect(state: GameState, targetId: PlayerID): GameState | null {
  const player = state.players[targetId];
  if (!player.immuneNextSpell) return null;
  return consumeProtection(state, targetId, 'immuneNextSpell', `🛡️ ${player.name} annule un effet de SORTILÈGE.`);
}

function shouldIgnoreMagicEffect(state: GameState, targetId: PlayerID): GameState | null {
  const player = state.players[targetId];
  if (!player.immuneNextMagic) return null;
  return consumeProtection(state, targetId, 'immuneNextMagic', `🛡️ ${player.name} annule un effet de MAGIE.`);
}

function withSkipNextTurn(state: GameState, playerId: PlayerID, message: string): GameState {
  const player = state.players[playerId];
  const next = setPlayer(state, { ...player, skipNextTurn: true });
  return addLog(next, message, 'warning', 'system');
}

type EffectHandler = (state: GameState, card: GridCard, nestedFilter?: CardPolarity | null) => GameState;

function revealTargetsWithFilter(state: GameState, sourceCard: GridCard, filter: CardPolarity): GameState {
  const targets = getArrowTargets(sourceCard, state.grid, true);
  if (targets.length === 0) return addLog(state, `${sourceCard.label} ne cible aucune carte valide.`, 'info', 'system');

  let next = state;
  for (const pos of targets) {
    const card = next.grid[pos.row][pos.col];
    if (card.flipped) continue;
    next = revealCard(next, card);
    next = addLog(next, `↪ ${sourceCard.label} révèle « ${card.label} ».`, 'info', 'system');
    next = runGridEffect(next, { ...card, flipped: true }, filter);
    if (next.phase === 'game_over') return next;
  }
  return next;
}

const GRID_EFFECTS: Record<GridCardEffect, EffectHandler> = {
  yeti: (state) => withSkipNextTurn(state, opp(state.currentTurn), '🦣 Yéti : l’adversaire passera son prochain tour.'),
  villager: (state) => addLog(state, '🏡 Villageois : aucun effet.', 'info', 'system'),
  troll: (state) => {
    const opponent = opp(state.currentTurn);
    let next = addLog(state, '👹 Troll : adversaire perd 1 vie et 1 magie.', 'danger', 'system');
    next = applyLifeLoss(next, opponent, 1, 'character');
    if (next.phase === 'game_over') return next;
    return discardRandomMagic(next, opponent, 1);
  },
  triton: (state) => {
    const opponent = opp(state.currentTurn);
    const target = state.players[opponent];
    const next = setPlayer(state, { ...target, immuneNextMagic: true });
    return addLog(next, '🌊 Triton : adversaire protégé contre votre prochaine magie.', 'warning', 'system');
  },
  treant: (state) => {
    const actor = state.players[state.currentTurn];
    const next = setPlayer(state, { ...actor, immuneNextMagic: true });
    return addLog(next, '🌳 Treant : vous êtes protégé contre la prochaine magie adverse.', 'success', 'system');
  },
  succubus: (state) => withSkipNextTurn(state, state.currentTurn, '😈 Succube : vous passerez votre prochain tour.'),
  siren: (state) => {
    const actorId = state.currentTurn;
    const opponentId = opp(actorId);
    const actor = state.players[actorId];
    if (actor.lives <= 0) return state;
    let next = applyLifeLoss(state, actorId, 1, 'character');
    if (next.phase === 'game_over') return next;
    const opponent = next.players[opponentId];
    next = setPlayer(next, { ...opponent, lives: opponent.lives + 1 });
    return addLog(next, '🧜 Sirène : vous donnez 1 vie à votre adversaire.', 'warning', 'system');
  },
  scientist: (state) => {
    let next = drawDefaultCard(state, 'human');
    next = drawDefaultCard(next, 'ai');
    return addLog(next, '🔬 Scientifique : chaque joueur pioche 1 carte.', 'success', 'system');
  },
  king: (state, card) => {
    const targets = getArrowTargets(card, state.grid, true);
    if (targets.length === 0) return addLog(state, '🤴 Roi : aucun verrou appliqué.', 'info', 'system');
    const merged = uniquePositions([...state.kingLockedTargets, ...targets]);
    const next = { ...state, kingLockedTargets: merged };
    return addLog(next, '🤴 Roi : les cartes pointées seront retournables en dernier.', 'warning', 'system');
  },
  queen: (state, card) => {
    const targets = getArrowTargets(card, state.grid, true);
    if (targets.length === 0) return addLog(state, '👑 Reine : aucune carte forcée.', 'info', 'system');
    const targetPlayer = opp(state.currentTurn);
    const next = {
      ...state,
      queenForcedQueue: targets,
      queenForcedFor: targetPlayer,
      arrowConstraint: null,
    };
    return addLog(next, `👑 Reine : ${state.players[targetPlayer].name} doit d’abord retourner ces cartes.`, 'warning', 'system');
  },
  princess_strict: (state, card) => {
    const targetPlayer = opp(state.currentTurn);
    if (state.queenForcedFor === targetPlayer && state.queenForcedQueue?.length) {
      return addLog(state, '👸 Princesse ignorée : la Reine a priorité.', 'info', 'system');
    }
    const targets = getArrowTargets(card, state.grid, true);
    if (targets.length === 0) return addLog(state, '👸 Princesse : aucune cible valide.', 'info', 'system');
    return {
      ...addLog(state, '👸 Princesse : l’adversaire est contraint à la carte pointée.', 'warning', 'system'),
      arrowConstraint: { sourceCardId: card.id, targets, forcedFor: targetPlayer },
    };
  },
  princess_proud: (state, card, filter) => GRID_EFFECTS.princess_strict(state, card, filter),
  princess_oppressive: (state, card, filter) => GRID_EFFECTS.princess_strict(state, card, filter),
  princess_disappointed: (state, card, filter) => GRID_EFFECTS.princess_strict(state, card, filter),
  princess_curious: (state, card, filter) => GRID_EFFECTS.princess_strict(state, card, filter),
  princess_angry: (state, card, filter) => GRID_EFFECTS.princess_strict(state, card, filter),
  princess_attentive: (state, card, filter) => GRID_EFFECTS.princess_strict(state, card, filter),
  princess_ambitious: (state, card, filter) => GRID_EFFECTS.princess_strict(state, card, filter),
  worker: (state) => addLog(drawDefaultCard(state, state.currentTurn), '🛠️ Ouvrier : vous piochez 1 carte.', 'success', 'system'),
  ogre: (state) => {
    let next = applyLifeLoss(state, 'human', 1, 'character');
    if (next.phase === 'game_over') return next;
    next = applyLifeLoss(next, 'ai', 1, 'character');
    return next;
  },
  minotaur: (state) => {
    const opponent = opp(state.currentTurn);
    const player = state.players[opponent];
    const next = setPlayer(state, { ...player, immuneNextSingleLifeLoss: true });
    return addLog(next, '🐂 Minotaure : adversaire protégé contre sa prochaine perte de 1 vie.', 'warning', 'system');
  },
  merchant_lugajo: (state) => {
    let next = drawMagic(state, 'human', 1);
    next = drawMagic(next, 'ai', 1);
    next = applyLifeLoss(next, 'human', 1, 'character');
    if (next.phase === 'game_over') return next;
    next = applyLifeLoss(next, 'ai', 1, 'character');
    return next;
  },
  merchant_lorino: (state) => drawMagic(discardRandomMagic(state, state.currentTurn, 1), state.currentTurn, 1),
  mage: (state) => {
    const target = opp(state.currentTurn);
    return drawMagic(discardRandomMagic(state, target, 1), target, 1);
  },
  librarian: (state) => {
    if (state.magicDeck.length === 0) return state;
    const deck = shuffle(state.magicDeck);
    const [card, ...rest] = deck;
    const player = state.players[state.currentTurn];
    return {
      ...setPlayer(state, { ...player, hand: [...player.hand, card] }),
      magicDeck: shuffle(rest),
    };
  },
  engineer: (state) => discardRandomMagic(discardRandomMagic(state, 'human', 1), 'ai', 1),
  ifrit: (state) => {
    const next = applyLifeLoss(state, state.currentTurn, 1, 'character');
    if (next.phase === 'game_over') return next;
    return discardRandomMagic(next, state.currentTurn, 1);
  },
  harpy: (state) => {
    const target = opp(state.currentTurn);
    const player = state.players[target];
    const next = setPlayer(state, { ...player, immuneNextSpell: true });
    return addLog(next, '🪽 Harpie : adversaire protégé contre son prochain sortilège.', 'warning', 'system');
  },
  warrior: (state) => {
    const target = opp(state.currentTurn);
    if (target === 'human') {
      return {
        ...state,
        pendingChoice: { type: 'discard_any_card', playerId: 'human', amount: 1 },
      };
    }
    const ai = state.players.ai;
    if (ai.hand.length > 0) return discardRandomMagic(state, 'ai', 1);
    return applyLifeLoss(state, 'ai', 1, 'character');
  },
  healer: (state) => drawLife(state, state.currentTurn, 1),
  goblin: (state) => {
    let next = state;
    const ai = next.players.ai;
    if (ai.hand.length > 0) next = discardRandomMagic(next, 'ai', 1);
    else next = applyLifeLoss(next, 'ai', 1, 'character');

    if (next.phase === 'game_over') return next;

    return {
      ...next,
      pendingChoice: { type: 'goblin', playerId: 'human' },
    };
  },
  giant: (state) => {
    const actor = state.players[state.currentTurn];
    return setPlayer(state, { ...actor, immuneNextLifeLoss: true });
  },
  proud_knight: (state) => {
    const actor = state.players[state.currentTurn];
    return setPlayer(state, { ...actor, immuneNextLifeLoss: true });
  },
  fairy: (state) => ({
    ...state,
    pendingChoice: { type: 'fairy_peek', playerId: state.currentTurn },
  }),
  gravedigger: (state) => {
    const actor = state.currentTurn;
    const target = opp(actor);
    let next = state;
    if (next.players[actor].hand.length === 0) next = drawMagic(next, actor, 1);
    return transferRandomMagic(next, actor, target);
  },
  druid: (state) => {
    const target = opp(state.currentTurn);
    const next = discardRandomMagic(state, target, 1);
    if (target === 'human') {
      return { ...next, pendingChoice: { type: 'discard_any_card', playerId: 'human', amount: 1 } };
    }
    if (next.players.ai.hand.length > 0) return discardRandomMagic(next, 'ai', 1);
    return applyLifeLoss(next, 'ai', 1, 'character');
  },
  demon_pfozet: (state, card) => revealTargetsWithFilter(state, card, 'negative'),
  demon_josu: (state) => {
    const actor = state.players[state.currentTurn];
    return setPlayer(state, { ...actor, immuneNextSpell: true });
  },
  knight_runu: (state) => {
    const actor = state.players[state.currentTurn];
    return setPlayer(state, { ...actor, immuneNextNegativeCharacter: true });
  },
  knight_gojo: (state) => {
    const actor = state.players[state.currentTurn];
    return setPlayer(state, { ...actor, immuneNextPositiveCharacter: true });
  },
  bibliothecary: (state) => drawMagic(state, state.currentTurn, 1),
  atlante: (state) => applyLifeLoss(state, opp(state.currentTurn), 1, 'character'),
  assassin: (state) => {
    const victim: PlayerID = Math.random() < 0.5 ? state.currentTurn : opp(state.currentTurn);
    let next = addLog(state, '🗡️ Assassin : pile ou face…', 'warning', 'system');
    next = applyLifeLoss(next, victim, 1, 'character');
    return next;
  },
  angel: (state, card) => revealTargetsWithFilter(state, card, 'positive'),
  friend: (state) => {
    let next = state;
    if (next.players.human.hand.length === 0) next = drawMagic(next, 'human', 1);
    if (next.players.ai.hand.length === 0) next = drawMagic(next, 'ai', 1);

    const humanHand = [...next.players.human.hand];
    const aiHand = [...next.players.ai.hand];
    if (humanHand.length === 0 || aiHand.length === 0) return next;

    const humanCard = humanHand[Math.floor(Math.random() * humanHand.length)];
    const aiCard = aiHand[Math.floor(Math.random() * aiHand.length)];

    const nextHuman = {
      ...next.players.human,
      hand: [...humanHand.filter((card) => card.id !== humanCard.id), aiCard],
    };
    const nextAi = {
      ...next.players.ai,
      hand: [...aiHand.filter((card) => card.id !== aiCard.id), humanCard],
    };

    return setPlayer(setPlayer(next, nextHuman), nextAi);
  },
  regeneration: (state) => drawLife(state, state.currentTurn, 1),
  burn: (state) => applyLifeLoss(state, state.currentTurn, 1, 'spell'),
  fireball: (state) => applyLifeLoss(state, opp(state.currentTurn), 1, 'spell'),
  electrocution: (state) => {
    const next = applyLifeLoss(state, state.currentTurn, 1, 'spell');
    if (next.phase === 'game_over') return next;
    return discardRandomMagic(next, state.currentTurn, 1);
  },
  lightning: (state) => applyLifeLoss(state, opp(state.currentTurn), 2, 'spell'),
  death: (state) => ({
    ...addLog(state, '💀 LA MORT : défaite immédiate.', 'danger', 'system'),
    phase: 'game_over',
    winner: opp(state.currentTurn),
  }),
};

function runGridEffect(state: GameState, card: GridCard, nestedFilter: CardPolarity | null = null): GameState {
  if (state.phase === 'game_over') return state;

  if (nestedFilter && card.polarity !== nestedFilter) {
    return addLog(state, `↪ ${card.label} révélé sans effet (${nestedFilter === 'positive' ? 'positif' : 'négatif'} requis).`, 'info', 'system');
  }

  if (card.kind === 'death' && nestedFilter) {
    return addLog(state, '↪ LA MORT est révélée mais son effet ne s’applique pas ici.', 'warning', 'system');
  }

  const current = state.currentTurn;
  if (card.kind === 'character') {
    const ignored = shouldIgnoreCharacterEffect(state, current, card.polarity);
    if (ignored) return ignored;
  }
  if (card.kind === 'spell') {
    const ignored = shouldIgnoreSpellEffect(state, current);
    if (ignored) return ignored;
  }

  const handler = GRID_EFFECTS[card.effect];
  if (!handler) return state;
  return handler(state, card, nestedFilter);
}

export function flipCard(state: GameState, position: Position): GameState {
  if (state.phase !== 'flip_card' && state.phase !== 'arrow_follow') return state;

  const allowed = getAllowedFlipTargets(state);
  if (!allowed.some((pos) => samePosition(pos, position))) return state;

  const card = state.grid[position.row][position.col];
  if (card.flipped) return state;

  let next = revealCard(state, card);
  const flippedCard = { ...card, flipped: true, peeked: false, peekedBy: null };

  next = {
    ...next,
    phase: 'apply_effect',
    lastFlippedCard: flippedCard,
    pendingChoice: null,
  };

  next = clearConsumedForcedConstraints(next, position);
  next = addLog(next, `${next.players[next.currentTurn].name} retourne « ${card.label} ».`, 'info', next.currentTurn);
  next = runGridEffect(next, flippedCard);

  return completeResolution(next);
}

const MAGIC_EFFECTS: Record<MagicCard['effect'], (state: GameState, card: MagicCard) => GameState> = {
  barrier: (state) => {
    const actor = state.players[state.currentTurn];
    return addLog(
      setPlayer(state, { ...actor, immuneNextSingleLifeLoss: true }),
      '🛡️ Barrière activée : prochaine perte de 1 vie annulée.',
      'success',
      'system',
    );
  },
  choice_of_soul: (state) => {
    if (state.currentTurn === 'human') {
      return {
        ...state,
        pendingChoice: { type: 'choice_of_soul', playerId: 'human' },
      };
    }
    return drawDefaultCard(state, 'ai');
  },
  concentration: (state) => withSkipNextTurn(state, state.currentTurn, '🧘 Concentration : vous passerez votre prochain tour.'),
  counter_magic: (state) => {
    const actor = state.players[state.currentTurn];
    return setPlayer(state, { ...actor, counterMagicActive: true });
  },
  immunity: (state) => {
    const actor = state.players[state.currentTurn];
    return setPlayer(state, { ...actor, immuneCharacterEffect: true });
  },
  manipulation: (state) => {
    if (state.currentTurn === 'human') {
      return {
        ...state,
        pendingChoice: { type: 'manipulation', playerId: 'human' },
      };
    }

    const available = state.grid.flat().filter((card) => !card.flipped).map((card) => card.position);
    if (available.length === 0) return state;
    const choice = available[Math.floor(Math.random() * available.length)];
    return {
      ...state,
      forcedFlipTargets: [choice],
      forcedFlipFor: opp(state.currentTurn),
    };
  },
  restriction: (state) => withSkipNextTurn(state, opp(state.currentTurn), '⛓️ Restriction : adversaire passera son prochain tour.'),
};

export function playMagicCard(state: GameState, card: MagicCard): GameState {
  if (state.phase === 'game_over') return state;

  const actorId = state.currentTurn;
  const opponentId = opp(actorId);
  const actor = state.players[actorId];
  const opponent = state.players[opponentId];

  if (!actor.hand.some((c) => c.id === card.id)) return state;

  if (card.timing === 'before' && state.phase !== 'play_magic_before') return state;
  if (card.timing === 'after' && state.phase !== 'play_magic_after') return state;

  if (card.timing !== 'counter' && actor.playedMagicThisTurn) {
    return addLog(state, 'Une seule carte de magie (hors contre) est autorisée par tour.', 'warning', actorId);
  }

  let next = setPlayer(state, {
    ...actor,
    hand: actor.hand.filter((c) => c.id !== card.id),
    discardPile: [...actor.discardPile, card],
    playedMagicThisTurn: card.timing === 'counter' ? actor.playedMagicThisTurn : true,
  });

  if (card.timing !== 'counter' && opponent.counterMagicActive) {
    next = setPlayer(next, { ...next.players[opponentId], counterMagicActive: false });
    return addLog(next, `🌀 Contre-magie : ${card.name} est annulée.`, 'warning', 'system');
  }

  if (card.effect !== 'counter_magic' && card.effect !== 'immunity' && card.effect !== 'barrier') {
    const ignored = shouldIgnoreMagicEffect(next, opponentId);
    if (ignored) return ignored;
  }

  const handler = MAGIC_EFFECTS[card.effect];
  if (!handler) return next;

  next = addLog(next, `${next.players[actorId].name} joue ${card.name}.`, 'info', actorId);
  next = handler(next, card);
  return next;
}

export function skipMagicBefore(state: GameState): GameState {
  if (state.phase !== 'play_magic_before') return state;
  const forcedTargets = getForcedTargetsForCurrent(state);
  if (forcedTargets.length > 0) {
    return { ...state, phase: 'arrow_follow' };
  }
  return { ...state, phase: 'flip_card' };
}

export function skipMagicAfter(state: GameState): GameState {
  if (state.phase !== 'play_magic_after') return state;
  return endTurn(state);
}

export function endTurn(state: GameState): GameState {
  if (state.phase === 'game_over') return state;

  const nextTurn = opp(state.currentTurn);
  let next: GameState = {
    ...state,
    currentTurn: nextTurn,
    phase: 'play_magic_before',
    turnNumber: state.turnNumber + 1,
    selectedMagicCard: null,
    pendingChoice: null,
    lastFlippedCard: null,
  };

  const current = next.players[nextTurn];
  next = setPlayer(next, { ...current, playedMagicThisTurn: false });

  if (next.magicDeck.length > 0) {
    next = drawMagic(next, nextTurn, 1);
  }

  if (next.players[nextTurn].skipNextTurn) {
    next = setPlayer(next, { ...next.players[nextTurn], skipNextTurn: false });
    next = addLog(next, `${next.players[nextTurn].name} passe son tour.`, 'warning', 'system');
    return endTurn(next);
  }

  return next;
}

export function resolveGoblinChoice(state: GameState, choice: 'lose_life' | 'discard_magic'): GameState {
  if (state.pendingChoice?.type !== 'goblin') return state;
  let next: GameState = { ...state, pendingChoice: null };

  if (choice === 'discard_magic' && next.players.human.hand.length > 0) {
    next = discardRandomMagic(next, 'human', 1);
    next = addLog(next, '👺 Vous défaussez 1 carte de magie.', 'info', 'human');
  } else {
    next = applyLifeLoss(next, 'human', 1, 'character');
  }

  return completeResolution(next);
}

export function resolveChoiceOfSoul(state: GameState, choice: 'draw_magic' | 'gain_life'): GameState {
  if (state.pendingChoice?.type !== 'choice_of_soul') return state;
  let next: GameState = { ...state, pendingChoice: null };

  if (choice === 'draw_magic') {
    next = drawMagic(next, 'human', 1);
  } else {
    next = drawLife(next, 'human', 1);
  }

  return completeResolution(next);
}

export function resolveFairyPeek(state: GameState, position: Position): GameState {
  if (state.pendingChoice?.type !== 'fairy_peek') return state;
  const card = state.grid[position.row][position.col];
  if (card.flipped) return state;

  const peeked = { ...card, peeked: true, peekedBy: state.pendingChoice.playerId };
  let next = setGridCard(state, peeked);
  next = { ...next, pendingChoice: null };
  next = addLog(next, `🧚 ${next.players[state.currentTurn].name} regarde une carte en secret.`, 'info', state.currentTurn);

  return completeResolution(next);
}

export function resolveManipulation(state: GameState, position: Position): GameState {
  if (state.pendingChoice?.type !== 'manipulation') return state;
  const card = state.grid[position.row][position.col];
  if (card.flipped) return state;

  const next = {
    ...state,
    pendingChoice: null,
    forcedFlipTargets: [position],
    forcedFlipFor: opp(state.currentTurn),
  };

  return completeResolution(addLog(next, '🎭 Manipulation : prochaine carte adverse imposée.', 'warning', state.currentTurn));
}

export function resolveDiscardAnyChoice(state: GameState, choice: 'lose_life' | 'discard_magic'): GameState {
  if (state.pendingChoice?.type !== 'discard_any_card') return state;

  const targetId = state.pendingChoice.playerId;
  const amount = state.pendingChoice.amount ?? 1;
  let next: GameState = { ...state, pendingChoice: null };

  if (choice === 'discard_magic' && next.players[targetId].hand.length > 0) {
    next = discardRandomMagic(next, targetId, amount);
  } else {
    next = applyLifeLoss(next, targetId, amount, 'character');
  }

  return completeResolution(next);
}
