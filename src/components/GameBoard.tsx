"use client";

import type { GameState, PlayerID, Position } from "@/lib/types";
import CardTile from "./CardTile";
import { getAllowedFlipTargets } from "@/lib/gameLogic";

interface Props {
  state: GameState;
  onCardClick: (pos: Position) => void;
  viewerID?: PlayerID;
}

export default function GameBoard({
  state,
  onCardClick,
  viewerID = "player1",
}: Props) {
  const { grid, currentTurn, pendingChoice } = state;

  const isLocalTurn = currentTurn === viewerID;
  const legalTargets = getAllowedFlipTargets(state);

  function isSelectable(pos: Position): boolean {
    const card = grid[pos.row][pos.col];
    if (card.flipped) return false;
    if (!isLocalTurn) return false;

    // Pending choice modes
    if (pendingChoice?.type === "fairy_peek") return true;
    if (pendingChoice?.type === "manipulation") return true;

    return legalTargets.some(
      (target) => target.row === pos.row && target.col === pos.col,
    );
  }

  function isArrowTarget(pos: Position): boolean {
    if (!isLocalTurn) return false;
    if (
      pendingChoice?.type === "fairy_peek" ||
      pendingChoice?.type === "manipulation"
    )
      return false;
    return legalTargets.some(
      (target) => target.row === pos.row && target.col === pos.col,
    );
  }

  function isPeekTarget(pos: Position): boolean {
    if (!isLocalTurn) return false;
    return (
      pendingChoice?.type === "fairy_peek" && !grid[pos.row][pos.col].flipped
    );
  }

  function isManipulationTarget(pos: Position): boolean {
    if (!isLocalTurn) return false;
    return (
      pendingChoice?.type === "manipulation" && !grid[pos.row][pos.col].flipped
    );
  }

  return (
    <div
      className="grid gap-2 w-full h-full"
      style={{ gridTemplateColumns: `repeat(6, 1fr)` }}
    >
      {grid.map((row) =>
        row.map((card) => (
          <CardTile
            key={card.id}
            card={card}
            viewerID={viewerID}
            isSelectable={isSelectable(card.position)}
            isArrowTarget={isArrowTarget(card.position)}
            isPeekTarget={isPeekTarget(card.position)}
            isManipulationTarget={isManipulationTarget(card.position)}
            onClick={onCardClick}
          />
        )),
      )}
    </div>
  );
}
