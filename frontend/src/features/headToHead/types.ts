import type { GameLevel, GameState, TournamentGrade } from '@/features/lobby/types';

// Shapes of HeadToHeadController.show props (Game.Query.fetch_head_to_head_page_data/2).

export type GameResult = 'won' | 'lost' | 'gave_up' | 'timeout' | 'undefined' | string;

export interface H2HPlayer {
  id: number;
  name: string;
  avatar_url: string | null;
  lang: string | null;
  points: number | null;
  rating: number | null;
  rank: number | null;
  wins: number;
}

export interface H2HGame {
  id: number;
  inserted_at: string;
  finishes_at: string | null;
  state: GameState | string;
  level: GameLevel;
  grade: TournamentGrade | null;
  duration_sec: number | null;
  timeout_seconds: number | null;
  first_player_result: GameResult | null;
  second_player_result: GameResult | null;
}

export interface HeadToHeadData {
  winner_id: number | null;
  total_games: number;
  completed_games: number;
  draws: number;
  /** Always two: the URL's user, then the opponent. */
  players: H2HPlayer[];
  /** Newest first. */
  games: H2HGame[];
}
