import type {
  ArrowDirection,
  GridCard,
  GridCardDefinition,
  MagicCard,
  MagicCardEffect,
  Position,
} from './types';

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function shuffle<T>(arr: T[]): T[] {
  const next = [...arr];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

const ALL_CHARACTERS: GridCardDefinition[] = [
  { effect: 'yeti', label: 'Le Yéti IHO', kind: 'character', polarity: 'positive', arrows: [], description: 'Votre adversaire passe son prochain tour.' },
  { effect: 'villager', label: 'Le Villageois SAMUIL', kind: 'character', polarity: 'positive', arrows: [], description: 'Il ne se passe rien.' },
  { effect: 'troll', label: 'Le Troll NUFO', kind: 'character', polarity: 'negative', arrows: [], description: 'Votre adversaire défausse 1 carte de VIE et 1 carte de MAGIE.' },
  { effect: 'triton', label: 'Le Triton OHIORAHU', kind: 'character', polarity: 'negative', arrows: [], description: 'Votre adversaire ne sera pas affecté par l’effet de votre prochaine carte de MAGIE.' },
  { effect: 'treant', label: 'Le Treant LUGAJO', kind: 'character', polarity: 'positive', arrows: [], description: 'Vous ne serez pas affecté par le prochain effet d’1 carte de MAGIE adverse.' },
  { effect: 'succubus', label: 'Le Succube TNUHO', kind: 'character', polarity: 'positive', arrows: [], description: 'Passez votre prochain tour.' },
  { effect: 'siren', label: 'La Sirène OUA', kind: 'character', polarity: 'negative', arrows: [], description: 'Donnez 1 de vos cartes de VIE à votre adversaire.' },
  { effect: 'scientist', label: 'Le Scientifique NITGLILT', kind: 'character', polarity: 'positive', arrows: [], description: 'Les joueurs piochent 1 carte.' },
  {
    effect: 'king',
    label: 'Le Roi PIL JADR',
    kind: 'character',
    polarity: 'negative',
    arrows: ['top-left', 'top', 'top-right', 'right', 'bottom-right', 'bottom', 'bottom-left', 'left'],
    description: 'Les cartes pointées ne peuvent être retournées qu’après toutes les autres.',
  },
  {
    effect: 'queen',
    label: 'La Reine PIL JADR',
    kind: 'character',
    polarity: 'negative',
    arrows: ['top-left', 'top', 'top-right', 'right', 'bottom-right', 'bottom', 'bottom-left', 'left'],
    description: 'Les joueurs doivent d’abord retourner les cartes pointées.',
  },
  { effect: 'princess_strict', label: 'La Princesse Stricte', kind: 'character', polarity: 'negative', arrows: ['bottom-left'], description: 'Votre adversaire ne peut retourner que la carte pointée.' },
  { effect: 'princess_proud', label: 'La Princesse Orgueilleuse', kind: 'character', polarity: 'negative', arrows: ['bottom'], description: 'Votre adversaire ne peut retourner que la carte pointée.' },
  { effect: 'princess_oppressive', label: 'La Princesse Oppressante', kind: 'character', polarity: 'negative', arrows: ['bottom-right'], description: 'Votre adversaire ne peut retourner que la carte pointée.' },
  { effect: 'princess_disappointed', label: 'La Princesse Déçue', kind: 'character', polarity: 'negative', arrows: ['right'], description: 'Votre adversaire ne peut retourner que la carte pointée.' },
  { effect: 'princess_curious', label: 'La Princesse Curieuse', kind: 'character', polarity: 'negative', arrows: ['top-left'], description: 'Votre adversaire ne peut retourner que la carte pointée.' },
  { effect: 'princess_angry', label: 'La Princesse Colérique', kind: 'character', polarity: 'negative', arrows: ['left'], description: 'Votre adversaire ne peut retourner que la carte pointée.' },
  { effect: 'princess_attentive', label: 'La Princesse Attentive', kind: 'character', polarity: 'negative', arrows: ['top-right'], description: 'Votre adversaire ne peut retourner que la carte pointée.' },
  { effect: 'princess_ambitious', label: 'La Princesse Ambitieuse', kind: 'character', polarity: 'negative', arrows: ['top'], description: 'Votre adversaire ne peut retourner que la carte pointée.' },
  { effect: 'worker', label: 'L’Ouvrier JADRLALD', kind: 'character', polarity: 'positive', arrows: [], description: 'Piochez 1 carte.' },
  { effect: 'ogre', label: 'L’Ogre PFOZET', kind: 'character', polarity: 'negative', arrows: [], description: 'Les joueurs défaussent 1 carte de VIE.' },
  { effect: 'minotaur', label: 'Le Minotaure RUNUPRNU', kind: 'character', polarity: 'positive', arrows: [], description: 'Votre adversaire ne sera pas affecté par le prochain effet qui doit lui faire défausser 1 carte de VIE.' },
  { effect: 'merchant_lugajo', label: 'Le Marchand LUGAJO', kind: 'character', polarity: 'negative', arrows: [], description: 'Les joueurs piochent 1 carte de MAGIE puis défaussent 1 carte de VIE.' },
  { effect: 'merchant_lorino', label: 'Le Marchand LORINO', kind: 'character', polarity: 'negative', arrows: [], description: 'Défaussez 1 carte de MAGIE puis piochez-en 1 autre.' },
  { effect: 'mage', label: 'Le Mage KOGU', kind: 'character', polarity: 'negative', arrows: [], description: 'Votre adversaire défausse 1 carte de MAGIE puis en pioche 1 autre.' },
  { effect: 'librarian', label: 'Le Libraire VOA', kind: 'character', polarity: 'positive', arrows: [], description: 'Ajoutez 1 carte de MAGIE du deck à votre main puis mélangez le deck.' },
  { effect: 'engineer', label: 'L’Ingénieur NITGLILT', kind: 'character', polarity: 'negative', arrows: [], description: 'Les joueurs défaussent 1 carte de MAGIE.' },
  { effect: 'ifrit', label: 'L’Ifrit VOA', kind: 'character', polarity: 'negative', arrows: [], description: 'Défaussez 1 carte de VIE et 1 carte de MAGIE.' },
  { effect: 'harpy', label: 'La Harpie OUNAULU', kind: 'character', polarity: 'positive', arrows: [], description: 'Votre adversaire ne sera pas affecté par le prochain effet d’1 carte de sortilège.' },
  { effect: 'warrior', label: 'Le Guerrier RUNU', kind: 'character', polarity: 'negative', arrows: [], description: 'Votre adversaire défausse 1 carte.' },
  { effect: 'healer', label: 'Le Guérisseur KEEL JADR', kind: 'character', polarity: 'positive', arrows: [], description: 'Piochez 1 carte de VIE.' },
  { effect: 'goblin', label: 'Le Gobelin FOLG', kind: 'character', polarity: 'negative', arrows: [], description: 'Les joueurs défaussent 1 carte.' },
  { effect: 'giant', label: 'Le Géant GOJO', kind: 'character', polarity: 'positive', arrows: [], description: 'Vous ne serez pas affecté par le prochain effet qui doit vous faire défausser 1+ carte de VIE.' },
  { effect: 'proud_knight', label: 'Le Fier Chevalier TORUN', kind: 'character', polarity: 'positive', arrows: [], description: 'Le prochain effet qui doit vous faire défausser 1+ carte de VIE ne s’applique pas.' },
  { effect: 'fairy', label: 'La Fée TALZ', kind: 'character', polarity: 'positive', arrows: [], description: 'Regardez, sans la dévoiler, 1 carte du plateau.' },
  { effect: 'gravedigger', label: 'Le Fossoyeur VIJO', kind: 'character', polarity: 'negative', arrows: [], description: 'Donnez 1 carte de MAGIE à votre adversaire, ou piochez-en 1 d’abord si vous n’en avez pas.' },
  { effect: 'druid', label: 'Le Druide LORINO', kind: 'character', polarity: 'negative', arrows: [], description: 'Votre adversaire défausse 1 carte de MAGIE et 1 autre carte.' },
  { effect: 'demon_pfozet', label: 'Le Démon PFOZET', kind: 'character', polarity: 'negative', arrows: ['top-left', 'top-right', 'bottom-left', 'bottom-right'], description: 'Révélez les cartes pointées. Seuls les effets négatifs s’appliquent.' },
  { effect: 'demon_josu', label: 'Le Démon JOSU', kind: 'character', polarity: 'positive', arrows: [], description: 'Vous ne serez pas affecté par le prochain effet d’1 carte de sortilège.' },
  { effect: 'knight_runu', label: 'Le Chevalier RUNU', kind: 'character', polarity: 'positive', arrows: [], description: 'Vous ne serez pas affecté par le prochain effet négatif d’1 carte de PERSONNAGE.' },
  { effect: 'knight_gojo', label: 'Le Chevalier GOJO', kind: 'character', polarity: 'negative', arrows: [], description: 'Vous ne serez pas affecté par le prochain effet positif d’1 carte de PERSONNAGE.' },
  { effect: 'bibliothecary', label: 'Le Bibliothécaire VIJO', kind: 'character', polarity: 'positive', arrows: [], description: 'Piochez 1 carte de MAGIE.' },
  { effect: 'atlante', label: 'L’Atlante TORUN', kind: 'character', polarity: 'negative', arrows: [], description: 'Votre adversaire défausse 1 carte de VIE.' },
  { effect: 'assassin', label: 'L’Assassin WJOH JADR', kind: 'character', polarity: 'negative', arrows: [], description: 'Lancez une pièce. Le joueur désigné défausse 1 carte de VIE.' },
  { effect: 'angel', label: 'L’Ange OUNAULU', kind: 'character', polarity: 'positive', arrows: ['top', 'right', 'bottom', 'left'], description: 'Révélez les cartes pointées. Seuls les effets positifs s’appliquent.' },
  { effect: 'friend', label: 'L’Ami JADRLALD', kind: 'character', polarity: 'negative', arrows: [], description: 'Les joueurs échangent 1 carte de MAGIE. Si un joueur n’en a pas, il pioche d’abord.' },
];

const SPELLS: GridCardDefinition[] = [
  { effect: 'regeneration', label: 'Régénération', kind: 'spell', polarity: 'positive', arrows: [], description: 'Piochez 1 carte de VIE.' },
  { effect: 'burn', label: 'Brûlure', kind: 'spell', polarity: 'negative', arrows: [], description: 'Défaussez 1 carte de VIE.' },
  { effect: 'fireball', label: 'Boule de feu', kind: 'spell', polarity: 'negative', arrows: [], description: 'Votre adversaire défausse 1 carte de VIE.' },
  { effect: 'electrocution', label: 'Électrocution', kind: 'spell', polarity: 'negative', arrows: [], description: 'Défaussez 1 carte de MAGIE et 1 carte de VIE.' },
  { effect: 'lightning', label: 'Foudroiement', kind: 'spell', polarity: 'negative', arrows: [], description: 'Votre adversaire défausse 2 cartes de VIE.' },
];

const DEATH_CARD: GridCardDefinition = {
  effect: 'death',
  label: 'LA MORT',
  description: 'Si vous retournez cette carte, vous perdez immédiatement la partie.',
  kind: 'death',
  polarity: null,
  arrows: [],
};

const MAGIC_DEFINITIONS: Array<Omit<MagicCard, 'id'> & { count: number }> = [
  { name: 'Barrière', effect: 'barrier', timing: 'counter', description: 'Défaussez cette carte à la place de défausser 1 carte de VIE.', emoji: '🛡️', count: 2 },
  { name: 'Choix d’âme', effect: 'choice_of_soul', timing: 'before', description: 'Piochez 1 carte de MAGIE ou 1 carte de VIE.', emoji: '✨', count: 2 },
  { name: 'Concentration', effect: 'concentration', timing: 'after', description: 'Passez votre prochain tour.', emoji: '🧘', count: 1 },
  { name: 'Contre-magie', effect: 'counter_magic', timing: 'counter', description: 'Annulez 1 carte de MAGIE adverse activée.', emoji: '🌀', count: 2 },
  { name: 'Immunité', effect: 'immunity', timing: 'counter', description: 'Annulez 1 effet de PERSONNAGE qui doit s’appliquer.', emoji: '✴️', count: 1 },
  { name: 'Manipulation', effect: 'manipulation', timing: 'after', description: 'Choisissez la prochaine carte que votre adversaire retournera.', emoji: '🎭', count: 1 },
  { name: 'Restriction', effect: 'restriction', timing: 'after', description: 'Faites passer le prochain tour de votre adversaire.', emoji: '⛓️', count: 1 },
];

export function getAllCharacterDefinitions(): GridCardDefinition[] {
  return [...ALL_CHARACTERS];
}

export function getModeGridDefinitions(): GridCardDefinition[] {
  const pickedCharacters = shuffle(ALL_CHARACTERS).slice(0, 18);
  return shuffle([...pickedCharacters, ...SPELLS, DEATH_CARD]);
}

export function buildGrid(rows = 4, cols = 6): GridCard[][] {
  const needed = rows * cols;
  // Base pool : 5 sorts + 1 mort + autant de personnages que nécessaire (max 44)
  const characterCount = Math.min(needed - SPELLS.length - 1, ALL_CHARACTERS.length);
  const pickedCharacters = shuffle(ALL_CHARACTERS).slice(0, characterCount);
  const defs = shuffle([...pickedCharacters, ...SPELLS, DEATH_CARD]);
  const grid: GridCard[][] = [];
  let cursor = 0;

  for (let row = 0; row < rows; row++) {
    grid[row] = [];
    for (let col = 0; col < cols; col++) {
      const def = defs[cursor++];
      grid[row][col] = {
        ...def,
        id: uid(),
        flipped: false,
        peeked: false,
        peekedBy: null,
        position: { row, col },
      };
    }
  }

  return grid;
}

export function buildMagicDeck(): MagicCard[] {
  const cards: MagicCard[] = [];
  MAGIC_DEFINITIONS.forEach((def) => {
    for (let i = 0; i < def.count; i++) {
      cards.push({
        id: uid(),
        name: def.name,
        effect: def.effect as MagicCardEffect,
        timing: def.timing,
        description: def.description,
        emoji: def.emoji,
      });
    }
  });
  return shuffle(cards);
}

export function arrowToOffset(direction: ArrowDirection): Position {
  switch (direction) {
    case 'top-left':
      return { row: -1, col: -1 };
    case 'top':
      return { row: -1, col: 0 };
    case 'top-right':
      return { row: -1, col: 1 };
    case 'right':
      return { row: 0, col: 1 };
    case 'bottom-right':
      return { row: 1, col: 1 };
    case 'bottom':
      return { row: 1, col: 0 };
    case 'bottom-left':
      return { row: 1, col: -1 };
    case 'left':
      return { row: 0, col: -1 };
  }
}

export function getArrowTargets(card: GridCard, grid: GridCard[][], onlyUnflipped = true): Position[] {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;

  return card.arrows
    .map((direction) => {
      const offset = arrowToOffset(direction);
      return { row: card.position.row + offset.row, col: card.position.col + offset.col };
    })
    .filter((pos) => pos.row >= 0 && pos.row < rows && pos.col >= 0 && pos.col < cols)
    .filter((pos) => (onlyUnflipped ? !grid[pos.row][pos.col].flipped : true));
}

export function getAdjacentPositions(pos: Position, grid: GridCard[][]): Position[] {
  const dirs: Position[] = [
    { row: -1, col: -1 },
    { row: -1, col: 0 },
    { row: -1, col: 1 },
    { row: 0, col: -1 },
    { row: 0, col: 1 },
    { row: 1, col: -1 },
    { row: 1, col: 0 },
    { row: 1, col: 1 },
  ];

  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;

  return dirs
    .map((dir) => ({ row: pos.row + dir.row, col: pos.col + dir.col }))
    .filter((next) => next.row >= 0 && next.row < rows && next.col >= 0 && next.col < cols);
}

export function samePosition(a: Position, b: Position): boolean {
  return a.row === b.row && a.col === b.col;
}

export function positionKey(pos: Position): string {
  return `${pos.row}:${pos.col}`;
}
