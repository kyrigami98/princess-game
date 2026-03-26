"use client";

import type { GamePhase, PlayerID, PendingChoiceType } from "@/lib/types";

interface Props {
  phase: GamePhase;
  currentTurn: PlayerID;
  aiThinking: boolean;
  arrowActive: boolean;
  forcedFlip: boolean;
  selectedMagicName: string | null;
  pendingChoice: PendingChoiceType | null;
  onSkipBefore: () => void;
  onSkipAfter: () => void;
}

export default function PhaseIndicator({
  phase,
  currentTurn,
  aiThinking,
  arrowActive,
  forcedFlip,
  selectedMagicName,
  pendingChoice,
}: Props) {
  if (phase === "game_over") return null;

  if (currentTurn === "ai" || aiThinking) {
    return (
      <span className="text-xs text-slate-400 animate-pulse">
        🤖 L&apos;IA joue…
      </span>
    );
  }

  if (pendingChoice === "fairy_peek") {
    return (
      <span className="text-xs text-cyan-300 font-semibold animate-pulse">
        🧚 Clique une carte pour la regarder en secret
      </span>
    );
  }
  if (pendingChoice === "manipulation") {
    return (
      <span className="text-xs text-violet-300 font-semibold animate-pulse">
        🎭 Désigne la prochaine carte de l&apos;adversaire
      </span>
    );
  }
  if (pendingChoice === "choice_of_soul") {
    return (
      <span className="text-xs text-amber-300 font-semibold animate-pulse">
        ✨ Choisis: carte de magie ou carte de vie
      </span>
    );
  }
  if (pendingChoice === "goblin" || pendingChoice === "discard_any_card") {
    return (
      <span className="text-xs text-red-300 font-semibold animate-pulse">
        ⚔️ Choix de défausse requis
      </span>
    );
  }

  if (selectedMagicName) {
    return (
      <span className="text-xs text-amber-300 font-semibold">
        ✨ {selectedMagicName} sélectionnée
      </span>
    );
  }

  if (arrowActive || forcedFlip) {
    return (
      <span className="text-xs text-orange-300 font-semibold animate-pulse">
        🏹 Retourne l&apos;une des cartes indiquées !
      </span>
    );
  }

  const labels: Partial<Record<GamePhase, string>> = {
    play_magic_before:
      "🃏 Joue une carte magie ou clique «&nbsp;Retourner&nbsp;»",
    flip_card: "🎴 Clique une carte pour la retourner",
    apply_effect: "⚡ Application de l'effet…",
    play_magic_after: "🃏 Joue une carte magie ou clique «&nbsp;Passer&nbsp;»",
  };

  const label = labels[phase] ?? "";
  return (
    <span
      className="text-xs text-slate-300"
      dangerouslySetInnerHTML={{ __html: label }}
    />
  );
}
