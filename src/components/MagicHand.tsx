'use client';

import { useState } from 'react';
import type { MagicCard, GamePhase, MagicTiming } from '@/lib/types';
import CardFace, { type CardData } from './CardFace';
import CardPreview from './CardPreview';

interface Props {
  hand: MagicCard[];
  phase: GamePhase;
  selectedCard: MagicCard | null;
  onSelect: (card: MagicCard | null) => void;
  merchantDiscardMode?: boolean;
  disabled: boolean;
}

function canPlayTiming(timing: MagicTiming, phase: GamePhase): boolean {
  if (phase === 'play_magic_before') return timing === 'before' || timing === 'both';
  if (phase === 'play_magic_after')  return timing === 'after'  || timing === 'both';
  return false;
}

function MagicCardButton({
  card, playable, isSelected, onSelect,
}: {
  card: MagicCard; playable: boolean; isSelected: boolean; onSelect: (c: MagicCard | null) => void;
}) {
  const [hoverRect, setHoverRect] = useState<DOMRect | null>(null);

  const cardData: CardData = {
    id: card.id,
    effect: card.effect,
    label: card.name,
    description: card.description,
    timing: card.timing,
    isMagic: true,
  };

  return (
    <>
      <button
        onClick={() => playable && onSelect(isSelected ? null : card)}
        onMouseEnter={e => setHoverRect(e.currentTarget.getBoundingClientRect())}
        onMouseLeave={() => setHoverRect(null)}
        disabled={!playable}
        className={[
          'relative flex-none transition-all duration-200',
          'w-16 h-24',
          isSelected  ? '-translate-y-6 scale-110 z-20' : '',
          playable && !isSelected ? 'hover:-translate-y-4 hover:z-10 cursor-pointer' : '',
          !playable   ? 'opacity-40 cursor-not-allowed grayscale' : '',
        ].join(' ')}
      >
        {/* Selection glow */}
        {isSelected && (
          <div className="absolute inset-0 rounded-lg ring-2 ring-amber-400 shadow-lg shadow-amber-500/50 z-10" />
        )}
        <CardFace card={cardData} size="sm" dimmed={!playable && !isSelected} />
      </button>

      {hoverRect && (
        <CardPreview card={cardData} anchorRect={hoverRect} />
      )}
    </>
  );
}

export default function MagicHand({ hand, phase, selectedCard, onSelect, merchantDiscardMode, disabled }: Props) {
  if (hand.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-slate-600 text-sm">
        Aucune carte magie en main
      </div>
    );
  }

  // Fan: slight rotation for each card (only visible if > 3 cards)
  const totalCards = hand.length;
  const maxAngle = Math.min(totalCards * 1.5, 8); // max ±8°

  return (
    <div className="h-full flex items-end justify-center pb-3 px-4">
      <div className="relative flex items-end justify-center" style={{ gap: '-4px' }}>
        {hand.map((card, i) => {
          const playable = merchantDiscardMode ? !disabled : (!disabled && canPlayTiming(card.timing, phase));
          const isSelected = selectedCard?.id === card.id;

          // Fan rotation: spread from center
          const angle = totalCards > 1
            ? ((i - (totalCards - 1) / 2) / ((totalCards - 1) / 2 || 1)) * maxAngle
            : 0;
          const translateY = totalCards > 1
            ? Math.abs(angle / maxAngle) * 6
            : 0;

          return (
            <div
              key={card.id}
              style={{
                transform: isSelected ? 'none' : `rotate(${angle}deg) translateY(${translateY}px)`,
                marginLeft: i > 0 ? '-8px' : 0,
                zIndex: isSelected ? 20 : i,
                transformOrigin: 'bottom center',
              }}
            >
              <MagicCardButton
                card={card}
                playable={playable}
                isSelected={isSelected}
                onSelect={onSelect}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
