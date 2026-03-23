import type { GridCard, GridCardEffect, ArrowDirection, MagicCard, Position } from './types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid(): string { return Math.random().toString(36).slice(2, 9); }

export function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ─── Grid Cards (personnages + sortilèges) — 4×6 = 24 cartes ─────────────────

interface GridTemplate {
  effect: GridCardEffect;
  label: string;
  description: string;
  arrows: ArrowDirection[];
}

const GRID_TEMPLATES: GridTemplate[] = [
  // ── Les 8 Princesses (1 flèche chacune) ────────────────────────────────────
  {
    effect: 'princess', label: 'La Princesse Orgueilleuse',
    description: "L'adversaire doit retourner la carte pointée.",
    arrows: ['bottom'],
  },
  {
    effect: 'princess', label: 'La Princesse Colérique',
    description: "L'adversaire doit retourner la carte pointée.",
    arrows: ['left'],
  },
  {
    effect: 'princess', label: 'La Princesse Stricte',
    description: "L'adversaire doit retourner la carte pointée.",
    arrows: ['bottom-left'],
  },
  {
    effect: 'princess', label: 'La Princesse Oppressante',
    description: "L'adversaire doit retourner la carte pointée.",
    arrows: ['bottom-right'],
  },
  {
    effect: 'princess', label: 'La Princesse Curieuse',
    description: "L'adversaire doit retourner la carte pointée.",
    arrows: ['top-left'],
  },
  {
    effect: 'princess', label: 'La Princesse Attentive',
    description: "L'adversaire doit retourner la carte pointée.",
    arrows: ['top-right'],
  },
  {
    effect: 'princess', label: 'La Princesse Ambitieuse',
    description: "L'adversaire doit retourner la carte pointée.",
    arrows: ['top'],
  },
  {
    effect: 'princess', label: 'La Princesse Déçue',
    description: "L'adversaire doit retourner la carte pointée.",
    arrows: ['right'],
  },
  // ── La Reine ────────────────────────────────────────────────────────────────
  {
    effect: 'queen', label: 'La Reine',
    description: "L'adversaire doit retourner toutes les cartes adjacentes, une par tour.",
    arrows: ['top-left','top','top-right','right','bottom-right','bottom','bottom-left','left'],
  },
  // ── Autres personnages ───────────────────────────────────────────────────────
  {
    effect: 'goblin', label: 'Le Gobelin',
    description: "Chaque joueur choisit : défausser 1 magie OU perdre 1 vie.",
    arrows: [],
  },
  {
    effect: 'friend', label: "L'Ami de Tous",
    description: "Les joueurs s'échangent 1 carte de magie. Celui sans magie pioche d'abord.",
    arrows: [],
  },
  {
    effect: 'fairy', label: 'La Fée',
    description: "Regardez en secret 1 carte posée sur la grille sans la retourner.",
    arrows: [],
  },
  {
    effect: 'healer', label: 'Le Guérisseur',
    description: 'Gagnez 1 vie.',
    arrows: [],
  },
  {
    effect: 'vampire', label: 'Le Vampire',
    description: "Perdez 1 vie. Votre adversaire gagne 1 vie.",
    arrows: [],
  },
  {
    effect: 'gravedigger', label: 'Le Fossoyeur',
    description: "Donnez 1 carte de magie à votre adversaire.",
    arrows: [],
  },
  {
    effect: 'villager', label: 'Le Villageois',
    description: 'Il ne se passe rien.',
    arrows: [],
  },
  {
    effect: 'villager', label: 'Le Villageois',
    description: 'Il ne se passe rien.',
    arrows: [],
  },
  {
    effect: 'mage', label: 'Le Mage',
    description: 'Piochez 1 carte de magie.',
    arrows: [],
  },
  {
    effect: 'merchant', label: 'Le Marchand de Sorts',
    description: 'Défaussez 1 carte de magie, puis piochez 1 carte de magie.',
    arrows: [],
  },
  // ── Sortilèges ───────────────────────────────────────────────────────────────
  {
    effect: 'lightning', label: 'Foudroiement',
    description: "Votre adversaire perd 2 vies.",
    arrows: [],
  },
  {
    effect: 'regeneration', label: 'Régénération',
    description: "Gagnez 1 vie.",
    arrows: [],
  },
  {
    effect: 'burn', label: 'Brûlure',
    description: "Perdez 1 vie.",
    arrows: [],
  },
  {
    effect: 'fireball', label: 'Boule de Feu',
    description: "Votre adversaire perd 1 vie.",
    arrows: [],
  },
  {
    effect: 'electrocution', label: 'Électrocution',
    description: "Perdez 1 vie et 1 carte de magie.",
    arrows: [],
  },
];

export function buildGrid(): GridCard[][] {
  const templates = shuffle([...GRID_TEMPLATES]);
  const ROWS = 4, COLS = 6;
  const grid: GridCard[][] = [];
  let idx = 0;
  for (let r = 0; r < ROWS; r++) {
    grid[r] = [];
    for (let c = 0; c < COLS; c++) {
      const tpl = templates[idx++];
      grid[r][c] = {
        id: uid(),
        effect: tpl.effect,
        arrows: tpl.arrows,
        flipped: false,
        peeked: false,
        peekedBy: null,
        position: { row: r, col: c },
        label: tpl.label,
        description: tpl.description,
      };
    }
  }
  return grid;
}

// ─── Magic Cards (deck) ───────────────────────────────────────────────────────

interface MagicTemplate {
  effect: MagicCard['effect'];
  name: string;
  timing: MagicCard['timing'];
  description: string;
  emoji: string;
  count: number;
}

const MAGIC_TEMPLATES: MagicTemplate[] = [
  {
    effect: 'restriction',
    name: 'Restriction',
    timing: 'after',
    description: "Après avoir retourné une carte, faites passer le prochain tour de votre adversaire.",
    emoji: '⛓️',
    count: 3,
  },
  {
    effect: 'concentration',
    name: 'Concentration',
    timing: 'before',
    description: "Avant de retourner une carte, sautez votre tour actuel sans retourner de carte.",
    emoji: '🧘',
    count: 2,
  },
  {
    effect: 'coup_decisif',
    name: 'Coup Décisif',
    timing: 'both',
    description: "Choisissez : piocher 1 carte de magie OU gagner 1 vie.",
    emoji: '⚔️',
    count: 3,
  },
  {
    effect: 'manipulation',
    name: 'Manipulation',
    timing: 'after',
    description: "Après avoir retourné une carte, désignez la prochaine carte que votre adversaire devra retourner.",
    emoji: '🎭',
    count: 3,
  },
  {
    effect: 'contre_magie',
    name: 'Contre Magie',
    timing: 'both',
    description: "Annule la prochaine carte de magie jouée par votre adversaire.",
    emoji: '🌀',
    count: 3,
  },
  {
    effect: 'annulation',
    name: 'Annulation',
    timing: 'before',
    description: "Avant de retourner une carte, soyez immunisé à son effet.",
    emoji: '✴️',
    count: 3,
  },
  {
    effect: 'barriere',
    name: 'Barrière',
    timing: 'both',
    description: "Protège d'un prochain effet qui vous ferait perdre une vie.",
    emoji: '🛡️',
    count: 3,
  },
];

export function buildMagicDeck(): MagicCard[] {
  const deck: MagicCard[] = [];
  for (const tpl of MAGIC_TEMPLATES) {
    for (let i = 0; i < tpl.count; i++) {
      deck.push({ id: uid(), name: tpl.name, effect: tpl.effect, timing: tpl.timing, description: tpl.description, emoji: tpl.emoji });
    }
  }
  return shuffle(deck);
}

// ─── Adjacency helpers ────────────────────────────────────────────────────────

export function arrowToOffset(dir: ArrowDirection): Position {
  switch (dir) {
    case 'top-left':     return { row: -1, col: -1 };
    case 'top':          return { row: -1, col:  0 };
    case 'top-right':    return { row: -1, col:  1 };
    case 'right':        return { row:  0, col:  1 };
    case 'bottom-right': return { row:  1, col:  1 };
    case 'bottom':       return { row:  1, col:  0 };
    case 'bottom-left':  return { row:  1, col: -1 };
    case 'left':         return { row:  0, col: -1 };
  }
}

export function getArrowTargets(card: GridCard, grid: GridCard[][]): Position[] {
  const ROWS = grid.length, COLS = grid[0].length;
  return card.arrows
    .map(dir => { const o = arrowToOffset(dir); return { row: card.position.row + o.row, col: card.position.col + o.col }; })
    .filter(p => p.row >= 0 && p.row < ROWS && p.col >= 0 && p.col < COLS && !grid[p.row][p.col].flipped);
}

export function getAdjacentPositions(pos: Position, grid: GridCard[][]): Position[] {
  const ROWS = grid.length, COLS = grid[0].length;
  const dirs: Position[] = [
    {row:-1,col:-1},{row:-1,col:0},{row:-1,col:1},{row:0,col:-1},
    {row:0,col:1},{row:1,col:-1},{row:1,col:0},{row:1,col:1},
  ];
  return dirs.map(d => ({row: pos.row+d.row, col: pos.col+d.col}))
    .filter(p => p.row >= 0 && p.row < ROWS && p.col >= 0 && p.col < COLS);
}
