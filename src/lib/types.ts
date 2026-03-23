// ─── Grid Cards ───────────────────────────────────────────────────────────────
// Cartes personnages + sortilèges (placées dans la grille)

export type GridCardEffect =
  // Personnages
  | 'princess'      // les 8 princesses : 1 flèche, adversaire doit retourner cette carte
  | 'queen'         // la reine : toutes les directions, adversaire doit retourner toutes les pointées
  | 'goblin'        // gobelin : chaque joueur choisit — défausser 1 magie OU perdre 1 vie
  | 'friend'        // ami de tous : échange 1 magie entre joueurs
  | 'fairy'         // fée : regarder en secret 1 carte
  | 'healer'        // guérisseur : +1 vie
  | 'vampire'       // vampire : -1 vie, adversaire +1 vie
  | 'gravedigger'   // fossoyeur : donner 1 magie à l'adversaire
  | 'villager'      // villageois : rien
  | 'mage'          // mage : piocher 1 magie
  | 'merchant'      // marchand de sorts : défausser 1 magie, piocher 1 magie
  // Sortilèges
  | 'lightning'     // foudroiement : adversaire -2 vies
  | 'regeneration'  // régénération : +1 vie
  | 'burn'          // brûlure : -1 vie
  | 'fireball'      // boule de feu : adversaire -1 vie
  | 'electrocution';// électrocution : -1 vie et -1 magie

export type ArrowDirection =
  | 'top-left' | 'top' | 'top-right' | 'right'
  | 'bottom-right' | 'bottom' | 'bottom-left' | 'left';

export interface Position { row: number; col: number; }

export interface GridCard {
  id: string;
  effect: GridCardEffect;
  arrows: ArrowDirection[];
  flipped: boolean;
  peeked: boolean;
  peekedBy: PlayerID | null;
  position: Position;
  label: string;
  description: string;
}

// ─── Magic Cards ──────────────────────────────────────────────────────────────

export type MagicCardEffect =
  | 'restriction'   // après : adversaire passe son prochain tour
  | 'concentration' // avant : vous sautez votre tour actuel
  | 'coup_decisif'  // avant/après : choisir piocher 1 magie OU +1 vie
  | 'manipulation'  // après : choisir la prochaine carte que l'adversaire doit retourner
  | 'contre_magie'  // avant/après : annuler la prochaine carte magie de l'adversaire
  | 'annulation'    // avant : immunisé à l'effet de la prochaine carte retournée
  | 'barriere';     // avant/après : protège d'un prochain dégât

export type MagicTiming = 'before' | 'after' | 'both';

export interface MagicCard {
  id: string;
  name: string;
  effect: MagicCardEffect;
  timing: MagicTiming;
  description: string;
  emoji: string;
}

// ─── Players ──────────────────────────────────────────────────────────────────

export type PlayerID = 'human' | 'ai';

export interface Player {
  id: PlayerID;
  name: string;
  lives: number;
  hand: MagicCard[];
  shielded: boolean;        // protège du prochain dégât (barrière)
  cursed: boolean;          // prochaine magie annulée (ancien système)
  nullifyNext: boolean;     // immunisé au prochain effet de carte (annulation)
  counterMagicActive: boolean; // contre_magie active : annule la prochaine magie adverse
}

// ─── Pending Choices ─────────────────────────────────────────────────────────
// Actions nécessitant un input humain

export type PendingChoiceType =
  | 'goblin'          // choisir entre perdre 1 vie ou défausser 1 magie
  | 'coup_decisif'    // choisir entre piocher 1 magie ou +1 vie
  | 'fairy_peek'      // cliquer une carte de la grille pour la regarder
  | 'merchant_discard'// cliquer une carte en main pour la défausser
  | 'manipulation';   // cliquer une carte de la grille pour la désigner

export interface PendingChoice {
  type: PendingChoiceType;
}

// ─── Game State ───────────────────────────────────────────────────────────────

export type GamePhase =
  | 'play_magic_before'
  | 'flip_card'
  | 'arrow_follow'    // doit retourner une des cartes indiquées (flèche / reine)
  | 'apply_effect'
  | 'play_magic_after'
  | 'game_over';

export type MagicPhase = 'before' | 'after' | null;

export interface ArrowConstraint {
  sourceCard: GridCard;
  targets: Position[];
}

export interface LogEntry {
  id: string;
  turn: number;
  player: PlayerID | 'system';
  message: string;
  type: 'info' | 'danger' | 'success' | 'warning';
}

export interface GameState {
  grid: GridCard[][];           // 4 × 6
  players: Record<PlayerID, Player>;
  currentTurn: PlayerID;
  phase: GamePhase;
  magicPhase: MagicPhase;
  turnNumber: number;
  arrowConstraint: ArrowConstraint | null;
  queenForcedQueue: Position[] | null; // file d'attente pour la reine (plusieurs flips forcés)
  pendingEffect: GridCardEffect | null;
  lastFlippedCard: GridCard | null;
  selectedMagicCard: MagicCard | null;
  pendingChoice: PendingChoice | null;  // input humain requis
  log: LogEntry[];
  winner: PlayerID | null;
  aiThinking: boolean;
  magicDeck: MagicCard[];
  forcedFlipTargets: Position[] | null; // manipulation magic card
}
