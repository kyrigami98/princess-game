'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameState, PlayerID } from '@/lib/types';
import { supabase, type GameRow } from '@/lib/supabase';

interface UseMultiplayerReturn {
  state: GameState | null;
  isMyTurn: boolean;
  isOpponentConnected: boolean;
  pushState: (newState: GameState) => Promise<void>;
  error: string | null;
}

export function useMultiplayer(
  gameCode: string,
  localRole: PlayerID,
  localPlayerId: string
): UseMultiplayerReturn {
  const [state, setState] = useState<GameState | null>(null);
  const [isOpponentConnected, setIsOpponentConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ── Fetch initial state and subscribe to realtime ──────────────────────
  useEffect(() => {
    let cancelled = false;

    async function init() {
      const { data, error: fetchError } = await supabase
        .from('games')
        .select('*')
        .eq('code', gameCode)
        .single<GameRow>();

      if (fetchError || !data) {
        if (!cancelled) setError('Partie introuvable.');
        return;
      }

      if (!cancelled) {
        setState(data.state);
        setIsOpponentConnected(!!data.player2_id);
      }
    }

    init();

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
          setState(row.state);
          setIsOpponentConnected(!!row.player2_id);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [gameCode]);

  // ── Push state after local action ──────────────────────────────────────
  const pushState = useCallback(
    async (newState: GameState) => {
      const { error: updateError } = await supabase
        .from('games')
        .update({
          state: newState,
          updated_at: new Date().toISOString(),
        })
        .eq('code', gameCode);

      if (updateError) {
        console.error('pushState error:', updateError);
      }
    },
    [gameCode]
  );

  const isMyTurn = state?.currentTurn === localRole;

  return { state, isMyTurn, isOpponentConnected, pushState, error };
}
