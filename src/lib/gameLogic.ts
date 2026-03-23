import type {
  GameState, GridCard, MagicCard, Player, PlayerID, Position, LogEntry,
} from './types';
import { buildGrid, buildMagicDeck, getArrowTargets } from './cards';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STARTING_LIVES = 3;
const STARTING_HAND  = 3;

function uid(): string { return Math.random().toString(36).slice(2, 9); }

function opp(id: PlayerID): PlayerID { return id === 'human' ? 'ai' : 'human'; }

function log(
  state: GameState, message: string,
  type: LogEntry['type'] = 'info',
  player: PlayerID | 'system' = state.currentTurn,
): GameState {
  return { ...state, log: [...state.log, { id: uid(), turn: state.turnNumber, player, message, type }] };
}

function setGrid(state: GameState, card: GridCard): GameState {
  return { ...state, grid: state.grid.map(row => row.map(c => c.id === card.id ? card : c)) };
}

function setPlayer(state: GameState, player: Player): GameState {
  return { ...state, players: { ...state.players, [player.id]: player } };
}

function drawCards(state: GameState, playerId: PlayerID, count: number): GameState {
  const deck = [...state.magicDeck];
  const drawn = deck.splice(0, count);
  const p = state.players[playerId];
  return { ...setPlayer(state, { ...p, hand: [...p.hand, ...drawn] }), magicDeck: deck };
}

function discardRandom(state: GameState, playerId: PlayerID): GameState {
  const p = state.players[playerId];
  if (p.hand.length === 0) return state;
  const idx = Math.floor(Math.random() * p.hand.length);
  return setPlayer(state, { ...p, hand: p.hand.filter((_, i) => i !== idx) });
}

// ─── Initial State ────────────────────────────────────────────────────────────

function makePlayer(id: PlayerID, name: string, hand: MagicCard[]): Player {
  return { id, name, lives: STARTING_LIVES, hand, shielded: false, cursed: false, nullifyNext: false, counterMagicActive: false };
}

export function createInitialState(): GameState {
  const deck = buildMagicDeck();
  return {
    grid: buildGrid(),
    players: {
      human: makePlayer('human', 'Vous', deck.splice(0, STARTING_HAND)),
      ai:    makePlayer('ai',    'IA',   deck.splice(0, STARTING_HAND)),
    },
    currentTurn: 'human',
    phase: 'play_magic_before',
    magicPhase: 'before',
    turnNumber: 1,
    arrowConstraint: null,
    queenForcedQueue: null,
    pendingEffect: null,
    lastFlippedCard: null,
    selectedMagicCard: null,
    pendingChoice: null,
    log: [{ id: uid(), turn: 0, player: 'system', message: 'La partie commence ! À vous de jouer.', type: 'info' }],
    winner: null,
    aiThinking: false,
    magicDeck: deck,
    forcedFlipTargets: null,
  };
}

// ─── Turn transitions ─────────────────────────────────────────────────────────

export function endTurn(state: GameState): GameState {
  const next = opp(state.currentTurn);
  const nextPlayer = state.players[next];
  let s: GameState = {
    ...state, currentTurn: next, phase: 'play_magic_before', magicPhase: 'before',
    pendingEffect: null, lastFlippedCard: null, selectedMagicCard: null,
    pendingChoice: null, turnNumber: state.turnNumber + 1,
  };
  // Draw 1 magic card for the new active player
  if (s.magicDeck.length > 0 && nextPlayer.hand.length < 7) {
    s = drawCards(s, next, 1);
  }
  // Restriction: if the next player is cursed (skip their turn)
  if (s.players[next].cursed) {
    s = setPlayer(s, { ...s.players[next], cursed: false });
    s = log(s, `⛓️ Restriction ! ${s.players[next].name} passe ce tour.`, 'warning', 'system');
    return endTurn(s);
  }
  return s;
}

export function skipMagicBefore(state: GameState): GameState {
  // Concentration was played — skip the flip entirely
  if (state.players[state.currentTurn].nullifyNext) {
    // nullifyNext is used here only for grid effects; concentration sets phase directly
  }
  // Queen forced queue
  if (state.queenForcedQueue && state.queenForcedQueue.length > 0) {
    return { ...state, phase: 'arrow_follow', magicPhase: null };
  }
  // Regular arrow constraint from previous turn
  if (state.arrowConstraint) {
    return { ...state, phase: 'arrow_follow', magicPhase: null };
  }
  // Forced flip (manipulation magic)
  if (state.forcedFlipTargets && state.forcedFlipTargets.length > 0) {
    return { ...state, phase: 'arrow_follow', magicPhase: null };
  }
  return { ...state, phase: 'flip_card', magicPhase: null };
}

export function skipMagicAfter(state: GameState): GameState {
  return endTurn(state);
}

// ─── Flip a card ──────────────────────────────────────────────────────────────

export function flipCard(state: GameState, position: Position): GameState {
  const { row, col } = position;
  const card = state.grid[row][col];
  if (card.flipped) return state;

  const flipped: GridCard = { ...card, flipped: true, peeked: false };
  let s = setGrid(state, flipped);

  // Clear arrow constraint / forced targets used to get here
  s = { ...s, lastFlippedCard: flipped, phase: 'apply_effect', arrowConstraint: null, forcedFlipTargets: null };

  // Update queen forced queue if applicable
  if (s.queenForcedQueue) {
    const remaining = s.queenForcedQueue.filter(p => !(p.row === row && p.col === col));
    s = { ...s, queenForcedQueue: remaining.length > 0 ? remaining : null };
  }

  s = log(s, `retourne "${card.label}".`, 'info');
  s = applyGridEffect(s, flipped);
  return s;
}

// ─── Apply grid card effects ──────────────────────────────────────────────────

function applyGridEffect(state: GameState, card: GridCard): GameState {
  const actor = state.players[state.currentTurn];
  const oppPlayer = state.players[opp(state.currentTurn)];

  // Annulation check (nullifyNext)
  if (actor.nullifyNext) {
    const updated = { ...actor, nullifyNext: false };
    let s = setPlayer(state, updated);
    s = log(s, `✴️ Annulation ! L'effet de "${card.label}" est ignoré.`, 'warning');
    return afterEffect(s);
  }

  switch (card.effect) {
    case 'princess':
    case 'queen': {
      const targets = getArrowTargets(card, state.grid);
      if (targets.length === 0) {
        let s = log(state, `"${card.label}" ne pointe vers aucune case valide.`, 'info');
        return afterEffect(s);
      }
      if (card.effect === 'queen') {
        // All targets go into forced queue for the opponent
        let s = log(state, `👑 La Reine ! L'adversaire doit retourner toutes les cases adjacentes.`, 'warning');
        s = { ...s, queenForcedQueue: targets, arrowConstraint: null };
        return afterEffect(s);
      }
      // Princess: single forced target for opponent
      let s = log(state, `👸 "${card.label}" désigne une carte — l'adversaire doit la retourner !`, 'warning');
      s = { ...s, arrowConstraint: { sourceCard: card, targets } };
      return afterEffect(s);
    }

    case 'goblin': {
      // AI chooses automatically; human needs UI choice
      let s = log(state, '👺 Gobelin ! Chaque joueur doit choisir.', 'warning');
      // AI auto-choice
      const aiPlayer = s.players.ai;
      if (aiPlayer.hand.length > 0) {
        s = discardRandom(s, 'ai');
        s = log(s, '🤖 L\'IA défausse une carte de magie.', 'info', 'ai');
      } else {
        s = applyDamage(s, 'ai', 1);
        s = log(s, '🤖 L\'IA perd 1 vie.', 'danger', 'ai');
      }
      // Human must choose via UI
      s = { ...s, pendingChoice: { type: 'goblin' } };
      // Stay in apply_effect — will resolve after human choice via resolveGoblinChoice()
      return s;
    }

    case 'friend': {
      // Exchange 1 magic card
      let humanP = state.players.human;
      let aiP    = state.players.ai;
      let s = state;

      // If a player has no cards, draw first
      if (humanP.hand.length === 0 && s.magicDeck.length > 0) {
        s = drawCards(s, 'human', 1);
        humanP = s.players.human;
        s = log(s, "🤝 Vous n'aviez pas de magie — vous piochez 1 carte d'abord.", 'info');
      }
      if (aiP.hand.length === 0 && s.magicDeck.length > 0) {
        s = drawCards(s, 'ai', 1);
        aiP = s.players.ai;
        s = log(s, "🤝 L'IA n'avait pas de magie — elle pioche 1 carte d'abord.", 'info', 'ai');
      }

      // Swap a random card from each
      if (humanP.hand.length > 0 && aiP.hand.length > 0) {
        const hi = Math.floor(Math.random() * humanP.hand.length);
        const ai_i = Math.floor(Math.random() * aiP.hand.length);
        const hCard = humanP.hand[hi];
        const aCard = aiP.hand[ai_i];
        const newHumanHand = [...humanP.hand]; newHumanHand[hi] = aCard;
        const newAiHand    = [...aiP.hand];    newAiHand[ai_i] = hCard;
        s = setPlayer(s, { ...humanP, hand: newHumanHand });
        s = setPlayer(s, { ...s.players.ai, hand: newAiHand });
        s = log(s, `🤝 Échange ! Vous donnez "${hCard.name}" et recevez "${aCard.name}".`, 'info');
      } else {
        s = log(s, "🤝 L'un des joueurs n'a pas de magie à échanger.", 'info');
      }
      return afterEffect(s);
    }

    case 'fairy': {
      // Current player peeks 1 card — need human input if human's turn
      if (state.currentTurn === 'human') {
        let s = log(state, '🧚 La Fée ! Cliquez une carte pour la regarder en secret.', 'info');
        return { ...s, pendingChoice: { type: 'fairy_peek' } };
      } else {
        // AI: pick best card to peek
        return afterEffect(log(state, '🧚 La Fée ! L\'IA regarde une carte en secret.', 'info'));
      }
    }

    case 'healer': {
      const updated = { ...actor, lives: actor.lives + 1 };
      let s = setPlayer(state, updated);
      s = log(s, `💚 Guérisseur : +1 vie (${updated.lives} vies).`, 'success');
      return afterEffect(s);
    }

    case 'vampire': {
      // Actor -1 vie, opponent +1 vie
      if (actor.shielded) {
        const updated = { ...actor, shielded: false };
        let s = setPlayer(state, updated);
        s = log(s, '🛡️ Barrière absorbée le drain du Vampire !', 'success');
        return afterEffect(s);
      }
      const newActorLives = Math.max(0, actor.lives - 1);
      const newOppLives   = oppPlayer.lives + 1;
      let s = setPlayer(state, { ...actor, lives: newActorLives });
      s = setPlayer(s, { ...oppPlayer, lives: newOppLives });
      s = log(s, `🧛 Vampire : vous perdez 1 vie (${newActorLives}), l'adversaire en gagne 1 (${newOppLives}).`, 'danger');
      if (newActorLives <= 0) {
        return { ...s, phase: 'game_over', winner: opp(state.currentTurn) };
      }
      return afterEffect(s);
    }

    case 'gravedigger': {
      if (actor.hand.length === 0) {
        let s = log(state, '⚰️ Fossoyeur : vous n\'avez pas de magie à donner.', 'info');
        return afterEffect(s);
      }
      const gi = Math.floor(Math.random() * actor.hand.length);
      const given = actor.hand[gi];
      const newActorHand = actor.hand.filter((_, i) => i !== gi);
      let s = setPlayer(state, { ...actor, hand: newActorHand });
      s = setPlayer(s, { ...oppPlayer, hand: [...oppPlayer.hand, given] });
      s = log(s, `⚰️ Fossoyeur : vous donnez "${given.name}" à l'adversaire.`, 'warning');
      return afterEffect(s);
    }

    case 'villager': {
      let s = log(state, '🏡 Villageois : il ne se passe rien.', 'info');
      return afterEffect(s);
    }

    case 'mage': {
      let s = drawCards(state, state.currentTurn, 1);
      s = log(s, '🔮 Mage : vous piochez 1 carte de magie.', 'success');
      return afterEffect(s);
    }

    case 'merchant': {
      if (state.currentTurn === 'human') {
        if (actor.hand.length === 0) {
          // No card to discard: just draw
          let s = drawCards(state, 'human', 1);
          s = log(s, '⚗️ Marchand : pas de carte à défausser, vous piochez 1.', 'info');
          return afterEffect(s);
        }
        let s = log(state, '⚗️ Marchand : cliquez une carte de votre main pour la défausser.', 'info');
        return { ...s, pendingChoice: { type: 'merchant_discard' } };
      } else {
        // AI: discard random, draw 1
        let s = discardRandom(state, 'ai');
        s = drawCards(s, 'ai', 1);
        s = log(s, '⚗️ Marchand : l\'IA défausse et pioche 1 magie.', 'info');
        return afterEffect(s);
      }
    }

    // ── Sortilèges ──────────────────────────────────────────────────────────
    case 'lightning': {
      let s = applyDamage(state, opp(state.currentTurn), 2);
      if (s.phase !== 'game_over') {
        s = log(s, `⚡ Foudroiement ! L'adversaire perd 2 vies.`, 'danger');
        s = afterEffect(s);
      }
      return s;
    }

    case 'regeneration': {
      const updated = { ...actor, lives: actor.lives + 1 };
      let s = setPlayer(state, updated);
      s = log(s, `🌿 Régénération : +1 vie (${updated.lives} vies).`, 'success');
      return afterEffect(s);
    }

    case 'burn': {
      let s = applyDamage(state, state.currentTurn, 1);
      if (s.phase !== 'game_over') {
        s = log(s, '🔥 Brûlure : vous perdez 1 vie.', 'danger');
        s = afterEffect(s);
      }
      return s;
    }

    case 'fireball': {
      let s = applyDamage(state, opp(state.currentTurn), 1);
      if (s.phase !== 'game_over') {
        s = log(s, '🔴 Boule de Feu ! L\'adversaire perd 1 vie.', 'danger');
        s = afterEffect(s);
      }
      return s;
    }

    case 'electrocution': {
      let s = applyDamage(state, state.currentTurn, 1);
      if (s.phase === 'game_over') return s;
      s = discardRandom(s, state.currentTurn);
      s = log(s, '🌩️ Électrocution : vous perdez 1 vie et 1 magie.', 'danger');
      return afterEffect(s);
    }

    default:
      return afterEffect(log(state, `Effet inconnu: ${card.effect}.`, 'warning'));
  }
}

function afterEffect(state: GameState): GameState {
  if (state.phase === 'game_over') return state;
  // If queen forced queue is active and not null, go to arrow_follow for the OPPONENT
  if (state.queenForcedQueue && state.queenForcedQueue.length > 0) {
    return { ...state, phase: 'play_magic_after', magicPhase: 'after' };
  }
  return { ...state, phase: 'play_magic_after', magicPhase: 'after' };
}

// Damage helper (with shield check)
function applyDamage(state: GameState, targetId: PlayerID, amount: number): GameState {
  const target = state.players[targetId];
  if (target.shielded) {
    const s = setPlayer(state, { ...target, shielded: false });
    return log(s, `🛡️ Barrière de ${target.name} absorbe les dégâts !`, 'success');
  }
  const newLives = Math.max(0, target.lives - amount);
  let s = setPlayer(state, { ...target, lives: newLives });
  if (newLives <= 0) {
    s = log(s, `💀 ${target.name} est éliminé !`, 'danger');
    return { ...s, phase: 'game_over', winner: opp(targetId) };
  }
  return log(s, `-${amount} vie pour ${target.name} (${newLives} vies).`, 'danger');
}

// ─── Play a Magic Card ────────────────────────────────────────────────────────

export function playMagicCard(state: GameState, card: MagicCard, _targetPos?: Position): GameState {
  const actor = state.players[state.currentTurn];
  const oppPlayer = state.players[opp(state.currentTurn)];

  // Check contre_magie on the opponent's side
  if (oppPlayer.counterMagicActive) {
    const updatedOpp = { ...oppPlayer, counterMagicActive: false };
    const newHand = actor.hand.filter(c => c.id !== card.id);
    let s = setPlayer(state, { ...actor, hand: newHand });
    s = setPlayer(s, updatedOpp);
    s = log(s, `🌀 Contre Magie ! "${card.name}" est annulée par l'adversaire.`, 'warning');
    return s;
  }

  const newHand = actor.hand.filter(c => c.id !== card.id);
  const updatedActor = { ...actor, hand: newHand };
  let s = setPlayer(state, updatedActor);

  switch (card.effect) {
    case 'restriction': {
      // After: mark the opponent as cursed so endTurn skips their next turn
      const opp2 = { ...s.players[opp(state.currentTurn)], cursed: true };
      s = setPlayer(s, opp2);
      s = log(s, '⛓️ Restriction ! L\'adversaire passera son prochain tour.', 'warning');
      return s;
    }
    case 'concentration': {
      // Before: skip your own turn (go directly to end of turn, no flip)
      s = log(s, '🧘 Concentration ! Vous passez votre tour sans retourner de carte.', 'info');
      return endTurn(s);
    }
    case 'coup_decisif': {
      if (state.currentTurn === 'human') {
        s = log(s, '⚔️ Coup Décisif ! Choisissez votre récompense.', 'info');
        return { ...s, pendingChoice: { type: 'coup_decisif' } };
      } else {
        // AI: gain life if low, else draw
        if (s.players.ai.lives <= 2) {
          const aiP = s.players.ai;
          s = setPlayer(s, { ...aiP, lives: aiP.lives + 1 });
          s = log(s, '⚔️ Coup Décisif : l\'IA gagne 1 vie.', 'success', 'ai');
        } else {
          s = drawCards(s, 'ai', 1);
          s = log(s, '⚔️ Coup Décisif : l\'IA pioche 1 magie.', 'success', 'ai');
        }
        return s;
      }
    }
    case 'manipulation': {
      if (state.currentTurn === 'human') {
        s = log(s, '🎭 Manipulation ! Cliquez une carte pour désigner la prochaine de l\'adversaire.', 'warning');
        return { ...s, pendingChoice: { type: 'manipulation' } };
      } else {
        // AI: pick a random unflipped card
        const unflipped = s.grid.flat().filter(c => !c.flipped);
        if (unflipped.length > 0) {
          const target = unflipped[Math.floor(Math.random() * unflipped.length)];
          s = { ...s, forcedFlipTargets: [target.position] };
          s = log(s, `🎭 Manipulation : l'IA désigne une carte pour votre prochain tour.`, 'warning', 'ai');
        }
        return s;
      }
    }
    case 'contre_magie': {
      const updated = { ...s.players[state.currentTurn], counterMagicActive: true };
      s = setPlayer(s, updated);
      s = log(s, '🌀 Contre Magie active ! La prochaine magie adverse sera annulée.', 'info');
      return s;
    }
    case 'annulation': {
      const updated = { ...s.players[state.currentTurn], nullifyNext: true };
      s = setPlayer(s, updated);
      s = log(s, '✴️ Annulation prête ! Vous serez immunisé au prochain effet de carte.', 'info');
      return s;
    }
    case 'barriere': {
      const updated = { ...s.players[state.currentTurn], shielded: true };
      s = setPlayer(s, updated);
      s = log(s, '🛡️ Barrière active ! Prochain dégât bloqué.', 'success');
      return s;
    }
    default:
      return s;
  }
}

// ─── Resolve pending human choices ───────────────────────────────────────────

export function resolveGoblinChoice(state: GameState, choice: 'lose_life' | 'discard_magic'): GameState {
  const human = state.players.human;
  let s: GameState = { ...state, pendingChoice: null };

  if (choice === 'lose_life') {
    const newLives = Math.max(0, human.lives - 1);
    s = setPlayer(s, { ...human, lives: newLives });
    s = log(s, `Gobelin : vous perdez 1 vie (${newLives}).`, 'danger', 'human');
    if (newLives <= 0) {
      return { ...s, phase: 'game_over', winner: 'ai' };
    }
  } else {
    if (human.hand.length > 0) {
      s = discardRandom(s, 'human');
      s = log(s, 'Gobelin : vous défaussez 1 carte de magie.', 'info', 'human');
    } else {
      const newLives = Math.max(0, human.lives - 1);
      s = setPlayer(s, { ...human, lives: newLives });
      s = log(s, `Gobelin : pas de magie — vous perdez 1 vie (${newLives}).`, 'danger', 'human');
      if (newLives <= 0) return { ...s, phase: 'game_over', winner: 'ai' };
    }
  }

  return afterEffect(s);
}

export function resolveCoupDecisif(state: GameState, choice: 'draw_magic' | 'gain_life'): GameState {
  let s: GameState = { ...state, pendingChoice: null };
  if (choice === 'draw_magic') {
    s = drawCards(s, 'human', 1);
    s = log(s, '⚔️ Coup Décisif : vous piochez 1 carte de magie.', 'success', 'human');
  } else {
    const human = s.players.human;
    s = setPlayer(s, { ...human, lives: human.lives + 1 });
    s = log(s, `⚔️ Coup Décisif : +1 vie (${s.players.human.lives}).`, 'success', 'human');
  }
  return s;
}

export function resolveFairyPeek(state: GameState, pos: Position): GameState {
  const target = state.grid[pos.row][pos.col];
  if (target.flipped) return state;
  const peeked = { ...target, peeked: true, peekedBy: 'human' as PlayerID };
  let s = setGrid(state, peeked);
  s = { ...s, pendingChoice: null };
  s = log(s, `🧚 Vous regardez "${target.label}" en secret.`, 'info', 'human');
  return afterEffect(s);
}

export function resolveMerchantDiscard(state: GameState, cardId: string): GameState {
  const human = state.players.human;
  const newHand = human.hand.filter(c => c.id !== cardId);
  const discarded = human.hand.find(c => c.id === cardId);
  let s = setPlayer(state, { ...human, hand: newHand });
  s = { ...s, pendingChoice: null };
  if (discarded) s = log(s, `⚗️ Marchand : vous défaussez "${discarded.name}".`, 'info', 'human');
  s = drawCards(s, 'human', 1);
  s = log(s, '⚗️ Marchand : vous piochez 1 carte de magie.', 'success', 'human');
  return afterEffect(s);
}

export function resolveManipulation(state: GameState, pos: Position): GameState {
  let s: GameState = { ...state, pendingChoice: null, forcedFlipTargets: [pos] };
  s = log(s, `🎭 Manipulation : vous désignez une carte — l'adversaire devra la retourner.`, 'warning', 'human');
  return s;
}

