import { createClient } from '@supabase/supabase-js';
import type { GameState } from './types';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);


export interface GameRow {
  id: string;
  code: string;
  state: GameState;
  player1_id: string;
  player2_id: string | null;
  status: 'waiting' | 'playing' | 'finished';
  created_at: string;
  updated_at: string;
}

export function getOrCreatePlayerId(): string {
  const key = 'princess_player_id';
  let id = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
  if (!id) {
    id = crypto.randomUUID();
    if (typeof window !== 'undefined') localStorage.setItem(key, id);
  }
  return id;
}

export function getOrCreatePlayerName(): string {
  const key = 'princess_player_name';
  if (typeof window === 'undefined') return 'Joueur';
  return localStorage.getItem(key) ?? '';
}

export function savePlayerName(name: string): void {
  if (typeof window !== 'undefined') localStorage.setItem('princess_player_name', name);
}

export function generateGameCode(): string {
  return Math.random().toString(36).slice(2, 6).toUpperCase();
}
