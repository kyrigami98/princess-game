const Q = '?w=400&h=560&fit=crop&auto=format&q=80';
const B = 'https://images.unsplash.com';

// Images par label de carte (prioritaire) puis par effet
export const CARD_IMAGES: Record<string, string> = {
  // ── Princesses (portraits distincts) ─────────────────────────────────────
  'La Princesse Orgueilleuse': `${B}/photo-1534528741775-53994a69daeb${Q}`,
  'La Princesse Colérique':    `${B}/photo-1531746020798-e6953c6e8e04${Q}`,
  'La Princesse Stricte':      `${B}/photo-1517841905240-472988babdf9${Q}`,
  'La Princesse Oppressante':  `${B}/photo-1529626455594-4ff0802cfb7e${Q}`,
  'La Princesse Curieuse':     `${B}/photo-1520813792240-56fc4a3765a7${Q}`,
  'La Princesse Attentive':    `${B}/photo-1513956589380-bad6acb9b9d4${Q}`,
  'La Princesse Ambitieuse':   `${B}/photo-1508214751196-bcfd4ca60f91${Q}`,
  'La Princesse Déçue':        `${B}/photo-1515886657613-9f3515b0c78f${Q}`,
  // ── Par effet ─────────────────────────────────────────────────────────────
  queen:         `${B}/photo-1578301978693-85fa9c0320b9${Q}`, // couronne/royauté
  goblin:        `${B}/photo-1534796636912-3b97b583f7cc${Q}`, // créature sombre
  friend:        `${B}/photo-1529156069898-49953e39b3ac${Q}`, // amis/chaleur
  fairy:         `${B}/photo-1519558260268-cde7e03a0b1f${Q}`, // magie/étincelles
  healer:        `${B}/photo-1441974231531-c6227db76b6e${Q}`, // forêt verte/guérison
  vampire:       `${B}/photo-1519834785169-98be25ec3f84${Q}`, // sombre/vampire
  gravedigger:   `${B}/photo-1504333638930-c8787321eee0${Q}`, // cimetière/lune
  villager:      `${B}/photo-1519750783826-e2420f4d687f${Q}`, // campagne/simple
  mage:          `${B}/photo-1462275646964-a0e3386b89fa${Q}`, // cosmos/magie
  merchant:      `${B}/photo-1555041469-a586c61ea9bc${Q}`,    // marché/trésors
  lightning:     `${B}/photo-1531366936337-7c912a4589a7${Q}`, // foudre/orage
  regeneration:  `${B}/photo-1518709766631-a6a7f45921c3${Q}`, // lumière/vie
  burn:          `${B}/photo-1527066579998-dbbae57f45ce${Q}`, // feu/brûlure
  fireball:      `${B}/photo-1611532736597-de2d4265fba3${Q}`, // boule de feu
  electrocution: `${B}/photo-1462275646964-a0e3386b89fa${Q}`, // électricité
  // ── Cartes magie ─────────────────────────────────────────────────────────
  restriction:   `${B}/photo-1508138221679-760a575d52bf${Q}`, // chaînes/contrainte
  concentration: `${B}/photo-1506905925346-21bda4d32df4${Q}`, // méditation/montagne
  coup_decisif:  `${B}/photo-1542159919831-40fb0656b45a${Q}`, // épée/décisif
  manipulation:  `${B}/photo-1518780664697-55e3ad937233${Q}`, // fils/manipulation
  contre_magie:  `${B}/photo-1608178398319-48f814d0750c${Q}`, // contrer/vide
  annulation:    `${B}/photo-1604076913837-52ab5629fde9${Q}`, // annulation/fumée
  barriere:      `${B}/photo-1589825832969-5d748a3e9e9f${Q}`, // bouclier/métal
  // Fallback pour princesses sans image spécifique
  princess:      `${B}/photo-1578301978693-85fa9c0320b9${Q}`,
};

export const EFFECT_ACCENT: Record<string, { from: string; border: string }> = {
  // Personnages
  princess:      { from: 'from-violet-950/80',  border: 'border-violet-500' },
  queen:         { from: 'from-amber-950/80',   border: 'border-amber-400' },
  goblin:        { from: 'from-green-950/80',   border: 'border-green-600' },
  friend:        { from: 'from-rose-950/80',    border: 'border-rose-400' },
  fairy:         { from: 'from-cyan-950/80',    border: 'border-cyan-400' },
  healer:        { from: 'from-emerald-950/80', border: 'border-emerald-400' },
  vampire:       { from: 'from-red-950/80',     border: 'border-red-600' },
  gravedigger:   { from: 'from-slate-900/80',   border: 'border-slate-500' },
  villager:      { from: 'from-stone-900/80',   border: 'border-stone-500' },
  mage:          { from: 'from-indigo-950/80',  border: 'border-indigo-400' },
  merchant:      { from: 'from-yellow-950/80',  border: 'border-yellow-500' },
  // Sortilèges
  lightning:     { from: 'from-yellow-950/80',  border: 'border-yellow-300' },
  regeneration:  { from: 'from-emerald-950/80', border: 'border-emerald-400' },
  burn:          { from: 'from-orange-950/80',  border: 'border-orange-500' },
  fireball:      { from: 'from-red-950/80',     border: 'border-red-500' },
  electrocution: { from: 'from-blue-950/80',    border: 'border-blue-400' },
  // Cartes magie
  restriction:   { from: 'from-slate-900/80',   border: 'border-slate-400' },
  concentration: { from: 'from-indigo-950/80',  border: 'border-indigo-400' },
  coup_decisif:  { from: 'from-amber-950/80',   border: 'border-amber-400' },
  manipulation:  { from: 'from-violet-950/80',  border: 'border-violet-400' },
  contre_magie:  { from: 'from-cyan-950/80',    border: 'border-cyan-400' },
  annulation:    { from: 'from-purple-950/80',  border: 'border-purple-400' },
  barriere:      { from: 'from-blue-950/80',    border: 'border-blue-400' },
};

export const EFFECT_EMOJI: Record<string, string> = {
  princess: '👸', queen: '👑', goblin: '👺', friend: '🤝',
  fairy: '🧚', healer: '💚', vampire: '🧛', gravedigger: '⚰️',
  villager: '🏡', mage: '🔮', merchant: '⚗️',
  lightning: '⚡', regeneration: '🌿', burn: '🔥', fireball: '🔴', electrocution: '🌩️',
  restriction: '⛓️', concentration: '🧘', coup_decisif: '⚔️',
  manipulation: '🎭', contre_magie: '🌀', annulation: '✴️', barriere: '🛡️',
};
