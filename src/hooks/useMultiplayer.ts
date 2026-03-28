'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameState, PlayerID } from '@/lib/types';
import { supabase, type GameRow } from '@/lib/supabase';

interface UseMultiplayerReturn {
  state: GameState | null;
  isMyTurn: boolean;
  isOpponentConnected: boolean;
  pushState: (newState: GameState) => Promise<void>;
  /** Fatal error (game not found) — should unmount the game. */
  fatalError: string | null;
  /** Transient network warning — show a toast but keep the game alive. */
  networkWarning: string | null;
}

/** Fetch the latest state from the DB and apply it if it's newer. */
async function fetchAndApply(
  gameCode: string,
  setState: React.Dispatch<React.SetStateAction<GameState | null>>,
  setIsOpponentConnected: React.Dispatch<React.SetStateAction<boolean>>,
  cancelled: () => boolean,
) {
  const { data } = await supabase
    .from('games')
    .select('state, player2_id')
    .eq('code', gameCode)
    .single<Pick<GameRow, 'state' | 'player2_id'>>();

  if (!data || cancelled()) return;

  setState((prev) => {
    if (prev && data.state.stateVersion <= prev.stateVersion) return prev;
    return data.state;
  });
  setIsOpponentConnected(!!data.player2_id);
}

export function useMultiplayer(
  gameCode: string,
  localRole: PlayerID,
  localPlayerId: string
): UseMultiplayerReturn {
  const [state, setState] = useState<GameState | null>(null);
  const [isOpponentConnected, setIsOpponentConnected] = useState(false);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [networkWarning, setNetworkWarning] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ── Fetch initial state and subscribe to realtime ──────────────────────
  useEffect(() => {
    let cancelled = false;
    const isCancelled = () => cancelled;

    async function init() {
      const { data, error: fetchError } = await supabase
        .from('games')
        .select('*')
        .eq('code', gameCode)
        .single<GameRow>();

      if (fetchError || !data) {
        if (!cancelled) setFatalError('Partie introuvable.');
        return;
      }

      if (!cancelled) {
        setState(data.state);
        setIsOpponentConnected(!!data.player2_id);
      }
    }

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`game-${gameCode}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'games',
          filter: `code=eq.${gameCode}`,
        },
        (payload) => {
          const row = payload.new as GameRow;
          setState((prev) => {
            // Reject stale updates: only accept if strictly newer version.
            // Falls back to turnNumber comparison for states saved before stateVersion was added.
            const incomingVersion = row.state.stateVersion ?? row.state.turnNumber;
            const prevVersion = prev
              ? (prev.stateVersion ?? prev.turnNumber)
              : -Infinity;
            if (incomingVersion <= prevVersion) return prev;
            return row.state;
          });
          setIsOpponentConnected(!!row.player2_id);
        }
      )
      .subscribe((status) => {
        // On (re)subscription, re-fetch to recover any updates missed during
        // a connection drop.
        if (status === 'SUBSCRIBED') {
          fetchAndApply(gameCode, setState, setIsOpponentConnected, isCancelled);
        }
        // On channel error, warn the user (non-fatal — Supabase will retry).
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          if (!cancelled) setNetworkWarning('Connexion instable. Reconnexion en cours…');
        }
        // Clear the warning once we're back.
        if (status === 'SUBSCRIBED' && !cancelled) {
          setNetworkWarning(null);
        }
      });

    channelRef.current = channel;

    // Fetch initial state AFTER subscription is set up so we don't miss
    // any update that arrives between fetch and subscribe.
    init();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [gameCode]);

  // ── Push state after local action (with retry + backoff) ───────────────
  const pushState = useCallback(
    async (newState: GameState) => {
      const MAX_RETRIES = 4;
      const BASE_DELAY_MS = 300;

      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        const { error: updateError } = await supabase
          .from('games')
          .update({
            state: newState,
            updated_at: new Date().toISOString(),
          })
          .eq('code', gameCode);

        if (!updateError) {
          // Success — clear any previous network warning.
          setNetworkWarning(null);
          return;
        }

        console.warn(`pushState attempt ${attempt + 1} failed:`, updateError.message);
        setNetworkWarning('Envoi en cours… (réseau instable)');

        if (attempt < MAX_RETRIES - 1) {
          // Exponential backoff: 300 ms, 600 ms, 1200 ms…
          await new Promise((r) => setTimeout(r, BASE_DELAY_MS * 2 ** attempt));
        }
      }

      // All retries exhausted.
      console.error('pushState failed after all retries');
      setNetworkWarning('Action non envoyée — vérifiez votre connexion.');
    },
    [gameCode]
  );

  const isMyTurn = state?.currentTurn === localRole;

  return { state, isMyTurn, isOpponentConnected, pushState, fatalError, networkWarning };
}
