'use client';

import type { GameState, Position } from '@/lib/types';
import CardTile from './CardTile';

interface Props {
  state: GameState;
  onCardClick: (pos: Position) => void;
}

export default function GameBoard({ state, onCardClick }: Props) {
  const { grid, phase, currentTurn, arrowConstraint, pendingChoice } = state;

  const isHumanTurn = currentTurn === 'human';
  const arrowTargets: Position[] = arrowConstraint?.targets ?? [];
  const forcedTargets: Position[] = state.forcedFlipTargets ?? [];

  function isSelectable(pos: Position): boolean {
    const card = grid[pos.row][pos.col];
    if (card.flipped) return false;
    if (!isHumanTurn) return false;

    // Pending choice modes
    if (pendingChoice?.type === 'fairy_peek') return true;
    if (pendingChoice?.type === 'manipulation') return true;

    if (phase === 'flip_card') return true;
    return false;
  }

  function isArrowTarget(pos: Position): boolean {
    if (!isHumanTurn) return false;
    if (phase !== 'arrow_follow') return false;
    return arrowTargets.some(t => t.row === pos.row && t.col === pos.col)
      || forcedTargets.some(t => t.row === pos.row && t.col === pos.col);
  }

  function isPeekTarget(pos: Position): boolean {
    if (!isHumanTurn) return false;
    return pendingChoice?.type === 'fairy_peek' && !grid[pos.row][pos.col].flipped;
  }

  function isManipulationTarget(pos: Position): boolean {
    if (!isHumanTurn) return false;
    return pendingChoice?.type === 'manipulation' && !grid[pos.row][pos.col].flipped;
  }

  return (
    <div
      className="grid gap-2 w-full"
      style={{ gridTemplateColumns: `repeat(6, 1fr)` }}
    >
      {grid.map(row =>
        row.map(card => (
          <CardTile
            key={card.id}
            card={card}
            viewerID="human"
            isSelectable={isSelectable(card.position)}
            isArrowTarget={isArrowTarget(card.position)}
            isSwapTarget={false}
            isPeekTarget={isPeekTarget(card.position)}
            isManipulationTarget={isManipulationTarget(card.position)}
            onClick={onCardClick}
          />
        )),
      )}
    </div>
  );
}
