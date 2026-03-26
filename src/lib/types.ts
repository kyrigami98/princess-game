export type PlayerID = 'human' | 'ai';

export type ArrowDirection =
  | 'top-left'
  | 'top'
  | 'top-right'
  | 'right'
  | 'bottom-right'
  | 'bottom'
  | 'bottom-left'
  | 'left';

export interface Position {
  row: number;
  col: number;
}

export type CardKind = 'character' | 'spell' | 'death';
export type CardPolarity = 'positive' | 'negative';

export type GridCardEffect =
  | 'yeti'
  | 'villager'
  | 'troll'
  | 'triton'
  | 'treant'
  | 'succubus'
  | 'siren'
  | 'scientist'
  | 'king'
  | 'queen'
  | 'princess_strict'
  | 'princess_proud'
  | 'princess_oppressive'
  | 'princess_disappointed'
  | 'princess_curious'
  | 'princess_angry'
  | 'princess_attentive'
  | 'princess_ambitious'
  | 'worker'
  | 'ogre'
  | 'minotaur'
  | 'merchant_lugajo'
  | 'merchant_lorino'
  | 'mage'
  | 'librarian'
  | 'engineer'
  | 'ifrit'
  | 'harpy'
  | 'warrior'
  | 'healer'
  | 'goblin'
  | 'giant'
  | 'proud_knight'
  | 'fairy'
  | 'gravedigger'
  | 'druid'
  | 'demon_pfozet'
  | 'demon_josu'
  | 'knight_runu'
  | 'knight_gojo'
  | 'bibliothecary'
  | 'atlante'
  | 'assassin'
  | 'angel'
  | 'friend'
  | 'regeneration'
  | 'burn'
  | 'fireball'
  | 'electrocution'
  | 'lightning'
  | 'death';

export interface GridCardDefinition {
  effect: GridCardEffect;
  label: string;
  description: string;
  kind: CardKind;
  polarity: CardPolarity | null;
  arrows: ArrowDirection[];
}

export interface GridCard extends GridCardDefinition {
  id: string;
  flipped: boolean;
  peeked: boolean;
  peekedBy: PlayerID | null;
  position: Position;
}

export type MagicTiming = 'before' | 'after' | 'counter';

export type MagicCardEffect =
  | 'barrier'
  | 'choice_of_soul'
  | 'concentration'
  | 'counter_magic'
  | 'immunity'
  | 'manipulation'
  | 'restriction';

export interface MagicCard {
  id: string;
  name: string;
  effect: MagicCardEffect;
  timing: MagicTiming;
  description: string;
  emoji: string;
}

export interface Player {
  id: PlayerID;
  name: string;
  lives: number;
  hand: MagicCard[];
  discardPile: MagicCard[];
  skipNextTurn: boolean;
  counterMagicActive: boolean;
  immuneCharacterEffect: boolean;
  immuneNextMagic: boolean;
  immuneNextSpell: boolean;
  immuneNextNegativeCharacter: boolean;
  immuneNextPositiveCharacter: boolean;
  immuneNextLifeLoss: boolean;
  immuneNextSingleLifeLoss: boolean;
  playedMagicThisTurn: boolean;
}

export type PendingChoiceType =
  | 'goblin'
  | 'choice_of_soul'
  | 'manipulation'
  | 'fairy_peek'
  | 'discard_any_card';

export interface PendingChoice {
  type: PendingChoiceType;
  playerId: PlayerID;
  amount?: number;
}

export type GamePhase =
  | 'play_magic_before'
  | 'flip_card'
  | 'arrow_follow'
  | 'apply_effect'
  | 'play_magic_after'
  | 'game_over';

export interface ArrowConstraint {
  sourceCardId: string;
  targets: Position[];
  forcedFor: PlayerID;
}

export interface LogEntry {
  id: string;
  turn: number;
  player: PlayerID | 'system';
  message: string;
  type: 'info' | 'danger' | 'success' | 'warning';
}

export interface GameState {
  grid: GridCard[][];
  players: Record<PlayerID, Player>;
  currentTurn: PlayerID;
  phase: GamePhase;
  turnNumber: number;
  arrowConstraint: ArrowConstraint | null;
  queenForcedQueue: Position[] | null;
  queenForcedFor: PlayerID | null;
  kingLockedTargets: Position[];
  forcedFlipTargets: Position[] | null;
  forcedFlipFor: PlayerID | null;
  pendingChoice: PendingChoice | null;
  selectedMagicCard: MagicCard | null;
  lastFlippedCard: GridCard | null;
  winner: PlayerID | null;
  aiThinking: boolean;
  log: LogEntry[];
  magicDeck: MagicCard[];
  lifeDeck: number;
}
