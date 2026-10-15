import type { TournamentGrade } from '@/features/lobby/types';

// Payloads of the `tournament:<id>` / `tournament_admin:<id>` channels
// (TournamentChannel, TournamentAdminChannel, Tournament.Helpers.prepare_to_json).
// Only the fields the room reads are typed; datetimes are naive UTC strings.

export type TournamentState = 'upcoming' | 'waiting_participants' | 'active' | 'finished' | 'canceled' | 'timeout';

export interface Tournament {
  id: number;
  name: string;
  description: string | null;
  type: 'swiss' | 'ladder' | string;
  state: TournamentState;
  grade: TournamentGrade;
  break_state: 'on' | 'off';
  access_type: 'public' | 'token';
  access_token: string | null;
  creator_id: number | null;
  moderator_ids: number[];
  is_live: boolean;
  show_results: boolean;
  use_chat: boolean;
  level: string | null;
  task_provider: string | null;
  task_pack_name: string | null;
  players_count: number;
  players_limit: number;
  rounds_limit: number;
  current_round_position: number;
  current_round_timeout_seconds: number | null;
  round_timeout_seconds: number | null;
  break_duration_seconds: number | null;
  use_infinite_break: boolean;
  timeout_mode: string | null;
  starts_at: string | null;
  started_at: string | null;
  last_round_started_at: string | null;
  last_round_ended_at: string | null;
  next_round_at: string | null;
  round_durations: number[] | null;
  server_time: string | null;
  match_timeout_seconds?: number | null;
  tournament_timeout_seconds?: number | null;
  ranking_type?: string | null;
  task_strategy?: string | null;
  event_id?: number | null;
  inserted_at?: string | null;
  updated_at?: string | null;
}

export type PlayerState = 'active' | 'banned' | 'finished' | 'finished_round' | 'matchmaking_active' | 'matchmaking_paused';

export interface Player {
  id: number;
  name: string;
  lang: string | null;
  clan: string | null;
  clan_id: number | null;
  avatar_url: string | null;
  score: number;
  place: number;
  wins_count: number;
  total_duration_sec: number | null;
  state: PlayerState;
  is_bot: boolean;
  rating: number | null;
  rank: number | null;
  matches_ids: number[];
}

export type MatchState = 'pending' | 'playing' | 'canceled' | 'game_over' | 'timeout';

export interface PlayerResult {
  id: number;
  result: 'won' | 'lost' | 'gave_up' | 'timeout' | 'undefined' | string;
  result_percent: number | null;
  lang: string | null;
  score?: number;
  /** Ladder scoring: score = base_score × score_factor × tests%. */
  base_score?: number;
  score_factor?: number;
}

export interface Match {
  id: number;
  game_id: number;
  player_ids: number[];
  player_results: Record<string, PlayerResult>;
  round_id: number | null;
  round_position: number;
  state: MatchState;
  winner_id: number | null;
  task_id: number | null;
  level: string | null;
  started_at: string | null;
  finished_at: string | null;
  duration_sec: number | null;
}

export interface RankingEntry {
  id: number;
  place: number;
  score: number;
  lang: string | null;
  name: string;
  clan_id: number | null;
  clan: string | null;
}

export interface Ranking {
  total_entries: number;
  page_number: number;
  page_size: number;
  entries: RankingEntry[];
}

export interface JoinReply {
  tournament: Tournament;
  players: Player[];
  matches: Match[];
  ranking: Ranking | null;
}

/** TournamentUserResult leaderboard row (`tournament:get_results` type "leaderboard"). */
export interface LeaderboardRow {
  user_id: number;
  user_name: string;
  user_lang: string | null;
  clan_id: number | null;
  clan_name: string | null;
  place: number;
  points: number;
  score: number;
  wins_count: number;
  games_count: number;
  total_time: number | null;
  avg_result_percent: number | string | null;
  is_cheater: boolean;
}

/** UserGameReport (admin channel `reports`, tournament:report:* events). */
export interface Report {
  id: number;
  offender_id: number;
  reporter_id: number;
  game_id: number;
  tournament_id: number;
  state: 'pending' | 'processed' | 'confirmed' | 'denied';
  reason: string;
  comment: string | null;
  inserted_at: string;
}
