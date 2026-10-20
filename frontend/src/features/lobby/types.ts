// Shapes of the lobby payloads (snake_case, as sent by the server).
// Games come from Game.Context.get_active_games/1 via the "lobby" channel and the
// `active_games` page prop; only fields the UI reads are typed.

export type GameState = 'waiting_opponent' | 'playing' | 'game_over' | 'timeout' | 'canceled';

export type GameLevel = 'elementary' | 'easy' | 'medium' | 'hard';

export interface CheckResult {
  status: string;
  success_count: number;
  asserts_count: number;
}

export interface LobbyPlayer {
  id: number;
  name: string;
  avatar_url: string | null;
  is_bot: boolean;
  is_guest: boolean;
  is_banned: boolean;
  creator: boolean;
  editor_lang: string;
  rank: number | null;
  rating: number | null;
  result: string;
  result_percent: number;
  check_result: CheckResult | null;
}

export interface LobbyGame {
  id: number;
  state: GameState;
  level: GameLevel;
  type: string;
  mode: string;
  task_type: string;
  visibility_type: 'public' | 'hidden';
  is_bot: boolean;
  is_tournament: boolean;
  starts_at: string | null;
  finishes_at: string | null;
  players: LobbyPlayer[];
}

export type TournamentGrade = 'open' | 'rookie' | 'challenger' | 'pro' | 'elite' | 'masters' | 'grand_slam';

export type TournamentState = 'upcoming' | 'waiting_participants' | 'active' | 'finished' | 'canceled';

// Tournament JSON (Jason.Encoder `only:` list in Codebattle.Tournament).
export interface LobbyTournament {
  id: number;
  name: string;
  grade: TournamentGrade;
  state: TournamentState;
  type: string;
  starts_at: string | null;
  players_count: number;
  description: string | null;
}

export interface LobbyJoinReply {
  active_games: LobbyGame[];
  live_tournaments: LobbyTournament[];
  season_tournaments: LobbyTournament[];
}

export interface Task {
  id: number;
  name: string;
  level: GameLevel;
  origin: string;
  description_en: string | null;
  description_ru: string | null;
  description_es?: string | null;
  description_zh?: string | null;
  creator_id: number | null;
  tags: string[];
}
