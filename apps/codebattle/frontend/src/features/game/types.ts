// Shapes of the game page props and the `game:<id>` channel (CodebattleWeb.GameChannel,
// CodebattleWeb.Api.GameView.render_game/2, Codebattle.Game.Player).

export type GameState = 'waiting_opponent' | 'playing' | 'game_over' | 'timeout' | 'canceled' | string;
export type PlayerResult = 'undefined' | 'won' | 'lost' | 'gave_up' | 'timeout' | string;

/** Codebattle.CodeCheck.Result.V2.AssertResult; values are pre-encoded strings. */
export interface AssertResult {
  status: 'success' | 'failure' | 'error' | string;
  execution_time?: number | null;
  output?: string | null;
  result?: string | null;
  expected?: string | null;
  arguments?: string | null;
}

/** Codebattle.CodeCheck.Result.V2 (+ client-only statuses). */
export interface CheckResult {
  status: 'initial' | 'started' | 'ok' | 'failure' | 'error' | 'memory_leak' | 'timeout' | 'service_timeout' | 'service_failure' | 'client_timeout' | 'game_is_dead' | string;
  exit_code?: number;
  success_count?: number;
  asserts_count?: number;
  output_error?: string;
  version?: number;
  asserts?: AssertResult[];
  /** Checked after the game timed out: shown, but doesn't count. */
  post_timeout?: boolean;
}

export interface GamePlayer {
  id: number;
  name: string;
  avatar_url: string | null;
  is_bot: boolean;
  is_guest: boolean;
  is_banned: boolean;
  creator: boolean;
  lang: string;
  editor_lang: string;
  editor_text: string;
  rank: number | null;
  rating: number | null;
  rating_diff: number | null;
  result: PlayerResult;
  result_percent: number | null;
  check_result: CheckResult | null;
  clan_id?: number | null;
}

export interface GameLang {
  slug: string;
  name: string;
  version: string;
  solution_template: string;
}

export interface GameTask {
  id: number;
  name: string;
  level: string;
  description_en: string | null;
  description_ru: string | null;
  examples: string | null;
  input_signature?: { argument_name: string; type: unknown }[];
  output_signature?: { type: unknown };
  asserts_examples?: { arguments: unknown[]; expected: unknown }[];
  base_score?: number | null;
  time_to_solve_sec?: number | null;
  tags?: string[];
  /** "github" for tasks from hexlet-codebattle/tasks (they get a "send a PR" link). */
  origin?: string;
}

/** Codebattle.Game.Query.build_head_to_head/2: all-time wins between the two players. */
export interface HeadToHead {
  winner_id: number | null;
  players: { id: number; wins: number }[];
}

export interface Game {
  id: number;
  award: string | null;
  head_to_head: HeadToHead | null;
  langs: GameLang[];
  level: string;
  locked: boolean;
  mode: string;
  players: GamePlayer[];
  rematch_initiator_id: number | null;
  rematch_state: 'none' | 'in_approval' | 'rejected' | 'accepted' | string;
  starts_at: string | null;
  state: GameState;
  task: GameTask | null;
  duration_sec: number | null;
  finishes_at: string | null;
  timeout_seconds: number | null;
  tournament_id: number | null;
  type: string;
  use_chat: boolean;
  use_timer: boolean;
  visibility_type: string;
}

export interface TournamentRankingEntry {
  id: number;
  place: number;
  score: number;
  name: string;
  lang: string | null;
  clan?: string | null;
  clan_id?: number | null;
}

/** The game channel's join reply `tournament` (GameChannel.join_tournament_game/3). */
export interface GameTournamentInfo {
  event_id: number | null;
  tournament_id: number;
  ranking: { entries: TournamentRankingEntry[] };
  state: string;
  type: string;
  break_state: string;
  last_round_started_at: string | null;
  last_round_ended_at: string | null;
  next_round_at: string | null;
  game_round_position: number | null;
  round_durations: number[] | null;
  server_time: string | null;
  break_duration_seconds: number | null;
  current_round_timeout_seconds: number | null;
  task_ids: number[];
  rounds_limit: number | null;
  current_round_position: number;
}

export interface TournamentPlayer {
  id: number;
  name: string;
  place: number;
  score: number;
  wins_count?: number;
  state?: string;
}

export interface GamePageProps {
  game: Game;
  game_id: number;
  tournament_id: number | null;
  players: { id: number; name: string; rating: number | null; rank: number | null; lang: string; avatar_url: string | null; is_bot: boolean }[];
  can_manage_game: boolean;
}

/** After the round: "round" (wait for the next one), "tournament" (last game), "rematch" (next game loading). */
export type WaitType = 'round' | 'tournament' | 'rematch' | null;
