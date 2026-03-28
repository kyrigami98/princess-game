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

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function opp(playerId: PlayerID): PlayerID {
  return playerId === 'player1' ? 'player2' : 'player1';
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
  };
}

export function createInitialState(player1Name = 'Joueur 1', player2Name = 'Joueur 2', gridRows = 4, gridCols = 6): GameState {
  const magicDeck = buildMagicDeck();
  return {
    grid: buildGrid(gridRows, gridCols),
    players: {
      player1: makePlayer('player1', player1Name, magicDeck.splice(0, STARTING_HAND)),
      player2: makePlayer('player2', player2Name, magicDeck.splice(0, STARTING_HAND)),
    },
    currentTurn: 'player1',
    phase: 'play_magic_before',
    turnNumber: 1,
    arrowConstraint: null,
    queenForcedQueue: null,
    queenForcedFor: null,
    kingLockedTargets: [],
    forcedFlipTargets: null,
    forcedFlipFor: null,
    pendingChoice: null,
    pendingCounter: null,
    coinFlipResult: null,
    lastSkippedTurn: null,
    lastCounterEvent: null,
    selectedMagicCard: null,
    lastFlippedCard: null,
    winner: null,
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
    stateVersion: 0,
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

function gainLife(state: GameState, playerId: PlayerID, amount = 1): GameState {
  if (amount <= 0) return state;
  const player = state.players[playerId];
  return setPlayer(state, { ...player, lives: player.lives + amount });
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
  if (state.phase === 'game_over' || state.pendingChoice || state.pendingCounter) return state;
  // Ne pas changer de phase si on est déjà dans une phase de magie (before ou after)
  if (state.phase === 'play_magic_before' || state.phase === 'play_magic_after') return state;
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

function applyLifeLossDirect(state: GameState, playerId: PlayerID, amount: number, source: 'character' | 'spell' | 'magic'): GameState {
  if (amount <= 0 || state.phase === 'game_over') return state;
  const player = state.players[playerId];
  const updatedLives = Math.max(0, player.lives - amount);
  let next = setPlayer(state, { ...player, lives: updatedLives });
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

function applyLifeLoss(state: GameState, playerId: PlayerID, amount: number, source: 'character' | 'spell' | 'magic'): GameState {
  if (amount <= 0 || state.phase === 'game_over') return state;
  const next = state;
  const player = next.players[playerId];

  if (player.immuneNextLifeLoss) {
    return consumeProtection(next, playerId, 'immuneNextLifeLoss', `🛡️ ${player.name} annule la prochaine perte de vie.`);
  }

  if (amount === 1 && player.immuneNextSingleLifeLoss) {
    return consumeProtection(next, playerId, 'immuneNextSingleLifeLoss', `🛡️ ${player.name} annule cette perte de 1 vie.`);
  }

  // Fenêtre de Barrière : si le joueur a une carte Barrière et aucune fenêtre de contre déjà active
  if (amount === 1 && !next.pendingCounter && player.hand.some((c) => c.effect === 'barrier')) {
    return {
      ...next,
      pendingCounter: {
        kind: 'barrier',
        forPlayer: playerId,
        description: `${player.name} est sur le point de perdre 1 vie.`,
        amount,
        source,
      },
    };
  }

  return applyLifeLossDirect(next, playerId, amount, source);
}

function drawDefaultCard(state: GameState, playerId: PlayerID): GameState {
  if (state.magicDeck.length > 0) return drawMagic(state, playerId, 1);
  return state;
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
    let next = drawDefaultCard(state, 'player1');
    next = drawDefaultCard(next, 'player2');
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
    let next = applyLifeLoss(state, 'player1', 1, 'character');
    if (next.phase === 'game_over') return next;
    next = applyLifeLoss(next, 'player2', 1, 'character');
    return next;
  },
  minotaur: (state) => {
    const opponent = opp(state.currentTurn);
    const player = state.players[opponent];
    const next = setPlayer(state, { ...player, immuneNextSingleLifeLoss: true });
    return addLog(next, '🐂 Minotaure : adversaire protégé contre sa prochaine perte de 1 vie.', 'warning', 'system');
  },
  merchant_lugajo: (state) => {
    let next = drawMagic(state, 'player1', 1);
    next = drawMagic(next, 'player2', 1);
    next = applyLifeLoss(next, 'player1', 1, 'character');
    if (next.phase === 'game_over') return next;
    next = applyLifeLoss(next, 'player2', 1, 'character');
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
  engineer: (state) => discardRandomMagic(discardRandomMagic(state, 'player1', 1), 'player2', 1),
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
    return {
      ...state,
      pendingChoice: { type: 'discard_any_card', playerId: target, amount: 1 },
    };
  },
  healer: (state) => gainLife(state, state.currentTurn, 1),
  goblin: (state) => {
    // Les deux joueurs doivent défausser 1 carte — on commence par l'adversaire
    const opponent = opp(state.currentTurn);
    return { ...state, pendingChoice: { type: 'goblin', playerId: opponent } };
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
    return { ...next, pendingChoice: { type: 'discard_any_card', playerId: target, amount: 1 } };
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
    next = { ...next, coinFlipResult: { victim, turnNumber: state.turnNumber } };
    next = applyLifeLoss(next, victim, 1, 'character');
    return next;
  },
  angel: (state, card) => revealTargetsWithFilter(state, card, 'positive'),
  friend: (state) => {
    let next = state;
    if (next.players.player1.hand.length === 0) next = drawMagic(next, 'player1', 1);
    if (next.players.player2.hand.length === 0) next = drawMagic(next, 'player2', 1);

    const p1Hand = [...next.players.player1.hand];
    const p2Hand = [...next.players.player2.hand];
    if (p1Hand.length === 0 || p2Hand.length === 0) return next;

    const p1Card = p1Hand[Math.floor(Math.random() * p1Hand.length)];
    const p2Card = p2Hand[Math.floor(Math.random() * p2Hand.length)];

    const nextP1 = {
      ...next.players.player1,
      hand: [...p1Hand.filter((card) => card.id !== p1Card.id), p2Card],
    };
    const nextP2 = {
      ...next.players.player2,
      hand: [...p2Hand.filter((card) => card.id !== p2Card.id), p1Card],
    };

    return setPlayer(setPlayer(next, nextP1), nextP2);
  },
  regeneration: (state) => gainLife(state, state.currentTurn, 1),
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

  // Fenêtre de contre : demander à l'adversaire avant d'appliquer l'effet
  const opponentId = opp(next.currentTurn);
  if (next.players[opponentId].hand.some((c) => c.effect === 'immunity')) {
    return {
      ...next,
      pendingCounter: {
        kind: 'character',
        forPlayer: opponentId,
        description: `${next.players[next.currentTurn].name} retourne « ${card.label} ».`,
        pendingGridCard: flippedCard,
      },
    };
  }

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
  choice_of_soul: (state) => ({
    ...state,
    pendingChoice: { type: 'choice_of_soul', playerId: state.currentTurn },
  }),
  concentration: (state) => withSkipNextTurn(state, state.currentTurn, '🧘 Concentration : vous passerez votre prochain tour.'),
  counter_magic: (state) => {
    const actor = state.players[state.currentTurn];
    return setPlayer(state, { ...actor, counterMagicActive: true });
  },
  immunity: (state) => {
    const actor = state.players[state.currentTurn];
    return setPlayer(state, { ...actor, immuneCharacterEffect: true });
  },
  manipulation: (state) => ({
    ...state,
    pendingChoice: { type: 'manipulation', playerId: state.currentTurn },
  }),
  restriction: (state) => withSkipNextTurn(state, opp(state.currentTurn), '⛓️ Restriction : adversaire passera son prochain tour.'),
};

export function playMagicCard(state: GameState, card: MagicCard): GameState {
  if (state.phase === 'game_over') return state;

  const actorId = state.currentTurn;
  const opponentId = opp(actorId);
  const actor = state.players[actorId];

  if (!actor.hand.some((c) => c.id === card.id)) return state;

  if (card.timing === 'before' && state.phase !== 'play_magic_before') return state;
  if (card.timing === 'after' && state.phase !== 'play_magic_after') return state;

  // Ces cartes ne peuvent être jouées que via la fenêtre de contre
  if (card.effect === 'counter_magic') {
    return addLog(state, '🌀 Contre-magie : activez-la en réponse à une magie adverse.', 'warning', actorId);
  }
  if (card.effect === 'barrier') {
    return addLog(state, '🛡️ Barrière : jouez-la en réponse à une perte de vie.', 'warning', actorId);
  }

  // Retirer la carte de la main
  let next = setPlayer(state, {
    ...actor,
    hand: actor.hand.filter((c) => c.id !== card.id),
    discardPile: [...actor.discardPile, card],
  });

  // Fenêtre de contre réactive : si l'adversaire a une contre-magie en main
  if (card.timing !== 'counter' && next.players[opponentId].hand.some((c) => c.effect === 'counter_magic')) {
    next = addLog(next, `${next.players[actorId].name} joue ${card.name}.`, 'info', actorId);
    return {
      ...next,
      pendingCounter: {
        kind: 'magic',
        forPlayer: opponentId,
        description: `${next.players[actorId].name} joue ${card.name}.`,
        pendingMagicCard: card,
      },
    };
  }

  // Vérifier l'immunité adverse uniquement pour les cartes qui ciblent l'adversaire
  const targetsOpponent = card.effect === 'restriction' || card.effect === 'manipulation';
  if (targetsOpponent) {
    const ignored = shouldIgnoreMagicEffect(next, opponentId);
    if (ignored) return ignored;
  }

  const handler = MAGIC_EFFECTS[card.effect];
  if (!handler) return next;

  next = addLog(next, `${next.players[actorId].name} joue ${card.name}.`, 'info', actorId);
  next = handler(next, card);
  return next;
}

export function forfeitGame(state: GameState, playerId: PlayerID): GameState {
  if (state.phase === 'game_over') return state;
  const next = addLog(state, `${state.players[playerId].name} abandonne la partie.`, 'warning', 'system');
  return { ...next, phase: 'game_over', winner: opp(playerId) };
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
    pendingCounter: null,
    coinFlipResult: null,
    lastSkippedTurn: null,
    lastCounterEvent: null,
    lastFlippedCard: null,
  };

  if (next.players[nextTurn].skipNextTurn) {
    const skippedPlayer = nextTurn;
    const skippedTurnNumber = next.turnNumber;
    next = setPlayer(next, { ...next.players[nextTurn], skipNextTurn: false });
    next = addLog(next, `${next.players[nextTurn].name} passe son tour.`, 'warning', 'system');
    const afterSkip = endTurn(next);
    return { ...afterSkip, lastSkippedTurn: { player: skippedPlayer, turnNumber: skippedTurnNumber } };
  }

  if (next.magicDeck.length > 0) {
    next = drawMagic(next, nextTurn, 1);
  }

  return next;
}

export function resolveGoblinChoice(state: GameState, choice: 'lose_life' | 'discard_magic'): GameState {
  if (state.pendingChoice?.type !== 'goblin') return state;
  const playerId = state.pendingChoice.playerId;
  const currentTurn = state.currentTurn;
  let next: GameState = { ...state, pendingChoice: null };

  if (choice === 'discard_magic' && next.players[playerId].hand.length > 0) {
    next = discardRandomMagic(next, playerId, 1);
    next = addLog(next, `👺 ${next.players[playerId].name} défausse 1 carte de magie.`, 'info', playerId);
  } else {
    next = applyLifeLoss(next, playerId, 1, 'character');
  }

  if (next.phase === 'game_over') return next;

  // Si c'était l'adversaire, maintenant c'est au joueur actif
  if (playerId === opp(currentTurn)) {
    return { ...next, pendingChoice: { type: 'goblin', playerId: currentTurn } };
  }

  return completeResolution(next);
}

export function resolveChoiceOfSoul(state: GameState, choice: 'draw_magic' | 'gain_life'): GameState {
  if (state.pendingChoice?.type !== 'choice_of_soul') return state;
  const playerId = state.pendingChoice.playerId;
  let next: GameState = { ...state, pendingChoice: null };

  if (choice === 'draw_magic') {
    next = drawMagic(next, playerId, 1);
  } else {
    next = gainLife(next, playerId, 1);
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

/** Le joueur choisit explicitement quelle carte défausser. */
export function resolveDiscardSpecific(state: GameState, cardId: string): GameState {
  if (state.pendingChoice?.type !== 'discard_any_card') return state;

  const targetId = state.pendingChoice.playerId;
  const player = state.players[targetId];
  const card = player.hand.find((c) => c.id === cardId);
  if (!card) return state;

  let next: GameState = { ...state, pendingChoice: null };
  next = setPlayer(next, {
    ...player,
    hand: player.hand.filter((c) => c.id !== cardId),
    discardPile: [...player.discardPile, card],
  });
  next = addLog(next, `${next.players[targetId].name} défausse ${card.name}.`, 'info', targetId);

  return completeResolution(next);
}

/**
 * Résoudre la fenêtre de contre-magie.
 * @param counterCardId  Identifiant de la carte Contre-magie jouée, ou undefined pour « laisser passer »
 */
export function resolveCounterWindow(state: GameState, counterCardId?: string): GameState {
  if (!state.pendingCounter) return state;

  const { forPlayer } = state.pendingCounter;
  let next: GameState = { ...state, pendingCounter: null };

  if (counterCardId) {
    const counterPlayer = next.players[forPlayer];
    const counterCard = counterPlayer.hand.find((c) => c.id === counterCardId);
    if (!counterCard) return next; // sécurité

    next = setPlayer(next, {
      ...counterPlayer,
      hand: counterPlayer.hand.filter((c) => c.id !== counterCardId),
      discardPile: [...counterPlayer.discardPile, counterCard],
    });

    const blockedEffectName =
      state.pendingCounter.kind === 'barrier'
        ? 'Perte de vie'
        : state.pendingCounter.kind === 'magic'
          ? state.pendingCounter.pendingMagicCard.name
          : state.pendingCounter.pendingGridCard.label;
    next = {
      ...next,
      lastCounterEvent: {
        counterCardName: counterCard.name,
        counterCardEmoji: counterCard.emoji,
        counterCardEffect: counterCard.effect,
        blockedEffectName,
        counterPlayerName: counterPlayer.name,
        turnNumber: state.turnNumber,
      },
    };

    if (state.pendingCounter.kind === 'barrier') {
      next = addLog(next, `🛡️ ${counterPlayer.name} utilise ${counterCard.name} : perte de vie annulée.`, 'success', 'system');
      return completeResolution(next);
    }

    const pendingName = state.pendingCounter.kind === 'magic'
      ? state.pendingCounter.pendingMagicCard.name
      : state.pendingCounter.pendingGridCard.label;

    next = addLog(next, `🌀 ${counterCard.name} : l'effet de ${pendingName} est annulé.`, 'warning', 'system');

    if (state.pendingCounter.kind === 'character') {
      return completeResolution(next);
    }
    return next;
  }

  // Joueur passe → appliquer l'effet
  if (state.pendingCounter.kind === 'magic') {
    const { pendingMagicCard } = state.pendingCounter;
    if (pendingMagicCard.effect !== 'immunity') {
      const ignored = shouldIgnoreMagicEffect(next, forPlayer);
      if (ignored) return ignored;
    }
    const handler = MAGIC_EFFECTS[pendingMagicCard.effect];
    if (!handler) return next;
    return handler(next, pendingMagicCard);
  } else if (state.pendingCounter.kind === 'character') {
    const { pendingGridCard } = state.pendingCounter;
    next = runGridEffect(next, pendingGridCard);
    return completeResolution(next);
  } else {
    // kind === 'barrier' : perte de vie directe sans nouvelle fenêtre
    const { amount, source } = state.pendingCounter;
    next = applyLifeLossDirect(next, forPlayer, amount, source);
    return completeResolution(next);
  }
}
