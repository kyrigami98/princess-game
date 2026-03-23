'use client';

import type { ArrowDirection, MagicTiming } from '@/lib/types';
import { CARD_IMAGES, EFFECT_ACCENT, EFFECT_EMOJI } from '@/lib/cardImages';

export interface CardData {
  id: string;
  effect: string;
  label: string;
  description: string;
  arrows?: ArrowDirection[];
  timing?: MagicTiming;
  isMagic?: boolean;
}

interface Props {
  card: CardData;
  size?: 'sm' | 'md' | 'lg';  // sm=hand, md=preview mini, lg=preview large
  dimmed?: boolean;
  className?: string;
}

const ARROW_POSITIONS: Record<ArrowDirection, string> = {
  'top-left':     'top-1 left-1',
  'top':          'top-1 left-1/2 -translate-x-1/2',
  'top-right':    'top-1 right-1',
  'right':        'top-1/2 right-1 -translate-y-1/2',
  'bottom-right': 'bottom-5 right-1',
  'bottom':       'bottom-5 left-1/2 -translate-x-1/2',
  'bottom-left':  'bottom-5 left-1',
  'left':         'top-1/2 left-1 -translate-y-1/2',
};

const ARROW_ICONS: Record<ArrowDirection, string> = {
  'top-left': '↖', 'top': '↑', 'top-right': '↗', 'right': '→',
  'bottom-right': '↘', 'bottom': '↓', 'bottom-left': '↙', 'left': '←',
};

const TIMING_LABEL: Record<MagicTiming, string> = {
  before: 'AVANT',
  after: 'APRÈS',
  both: 'LIBRE',
};

const TIMING_COLOR: Record<MagicTiming, string> = {
  before: 'bg-sky-700 text-sky-100',
  after: 'bg-rose-700 text-rose-100',
  both: 'bg-violet-700 text-violet-100',
};

export default function CardFace({ card, size = 'md', dimmed, className = '' }: Props) {
  const accent = EFFECT_ACCENT[card.effect] ?? EFFECT_ACCENT.safe;
  const image = CARD_IMAGES[card.effect];
  const emoji = card.isMagic ? (EFFECT_EMOJI[card.effect] ?? '✨') : (EFFECT_EMOJI[card.effect] ?? '✨');

  const textSizes = {
    sm: { emoji: 'text-base', name: 'text-[9px]', desc: 'text-[7px]', badge: 'text-[7px]' },
    md: { emoji: 'text-xl',   name: 'text-[11px]', desc: 'text-[9px]', badge: 'text-[8px]' },
    lg: { emoji: 'text-3xl',  name: 'text-sm',     desc: 'text-xs',    badge: 'text-[10px]' },
  }[size];

  return (
    <div
      className={[
        'relative rounded-lg border-2 overflow-hidden flex flex-col w-full h-full select-none',
        accent.border,
        dimmed ? 'opacity-50 grayscale' : '',
        className,
      ].join(' ')}
    >
      {/* Image background — top 70% */}
      <div className="relative flex-1 overflow-hidden">
        {image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={card.label}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        )}
        {/* Gradient overlay */}
        <div className={`absolute inset-0 bg-gradient-to-t ${accent.from} to-transparent`} />

        {/* Arrow indicators */}
        {card.arrows && card.arrows.length > 0 && card.arrows.map(dir => (
          <span
            key={dir}
            className={`absolute font-black text-amber-300 drop-shadow ${ARROW_POSITIONS[dir]} ${
              size === 'sm' ? 'text-[10px]' : 'text-sm'
            }`}
          >
            {ARROW_ICONS[dir]}
          </span>
        ))}

        {/* Emoji top-center */}
        <div className={`absolute top-1.5 left-1/2 -translate-x-1/2 ${textSizes.emoji} drop-shadow-lg`}>
          {emoji}
        </div>
      </div>

      {/* Info band — bottom */}
      <div className="bg-black/70 px-1.5 py-1 flex flex-col gap-0.5 shrink-0">
        <span className={`font-bold text-white leading-tight text-center ${textSizes.name} truncate`}>
          {card.label}
        </span>
        {size !== 'sm' && (
          <span className={`text-slate-300 leading-tight text-center ${textSizes.desc} line-clamp-2`}>
            {card.description}
          </span>
        )}
      </div>

      {/* Magic timing badge */}
      {card.isMagic && card.timing && (
        <span className={`absolute top-0.5 right-0.5 font-bold rounded px-0.5 ${textSizes.badge} ${TIMING_COLOR[card.timing]}`}>
          {TIMING_LABEL[card.timing]}
        </span>
      )}
    </div>
  );
}
