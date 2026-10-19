// GET /api/v1/user/:id/achievements (UserController.achievements) — the data
// behind the hover card. Only fields the card reads are typed.

import type { HeadToHead } from '@/features/game/types';

export interface Achievement {
  type: string;
  meta: {
    count?: number;
    label?: string;
    grade?: string;
    languages?: string[];
  };
}

export interface UserCardData {
  user: {
    id: number;
    name: string;
    avatar_url: string | null;
    clan: string | null;
    lang: string | null;
    rank: number | null;
    points: number | null;
    rating: number | null;
  };
  /** The game they're playing right now, if any. */
  active_game_id: number | null;
  /** Latest session activity (ISO), null if never seen since sessions exist. */
  last_active_at: string | null;
  achievements: Achievement[];
  metrics: {
    game_stats: { won: number; lost: number; gave_up: number };
    tournaments_stats: {
      rookie_wins: number;
      challenger_wins: number;
      pro_wins: number;
      elite_wins: number;
      masters_wins: number;
      grand_slam_wins: number;
    };
  };
}

export async function fetchUserCard(userId: number): Promise<UserCardData> {
  const response = await fetch(`/api/v1/user/${userId}/achievements`);
  if (!response.ok) throw new Error(`achievements: ${response.status}`);

  return response.json();
}

/** Separate request so a slow matchup query never delays the rest of the card. */
export async function fetchUserHeadToHead(userId: number, signal: AbortSignal): Promise<HeadToHead | null> {
  const response = await fetch(`/api/v1/user/${userId}/head_to_head`, { signal });
  if (!response.ok) throw new Error(`head_to_head: ${response.status}`);

  const data: { head_to_head: HeadToHead | null } = await response.json();
  return data.head_to_head;
}
