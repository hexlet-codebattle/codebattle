// Payloads of GroupTournamentChannel / Api.V1.GroupTournamentController, raw snake_case.

export type GroupTournamentState = 'waiting_participants' | 'active' | 'finished' | 'canceled';

/** GroupTournament.Context.serialize_group_tournament/1 (only the fields the page reads). */
export interface GroupTournament {
  id: number;
  name: string;
  state: GroupTournamentState | string;
  type: 'individual' | 'ranked' | string;
  starts_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  current_round_position: number | null;
  rounds_count: number | null;
  round_timeout_seconds: number | null;
  seed_round_timeout_seconds: number | null;
  break_duration_seconds: number | null;
  has_seed_round: boolean;
  last_round_started_at: string | null;
  players_count: number | null;
  show_leaderboard: boolean;
  is_infinite: boolean;
  local_folder: string | null;
}

/** A leaderboard cell: the player's slice, place and points in one round. */
export interface RoundCell {
  slice_index: number | null;
  place: number | null;
  score: number | null;
}

/** LeaderboardStore entry (Context.build_leaderboard/1). `rounds` is keyed by round_position. */
export interface LeaderboardEntry {
  user_id: number;
  name: string | null;
  avatar_url: string | null;
  clan: string | null;
  clan_id: number | null;
  /** Not sent yet; shown when the server adds it. */
  lang?: string | null;
  state: string | null;
  slice_index: number | null;
  total_score: number | null;
  seed_score: number | null;
  rounds: Record<string, RoundCell | undefined>;
}

export interface Solution {
  id: number;
  user_id: number;
  lang: string;
  solution: string;
  inserted_at: string;
}

export type RunKind = 'user' | 'seed' | 'slice' | string;

/** Context.serialize_run/1, merged with run:request details and run_updated stubs. */
export interface Run {
  id: number;
  kind: RunKind;
  status: 'pending' | 'success' | 'error' | 'timeout' | string;
  player_ids?: number[] | null;
  slice_index: number | null;
  round_position: number | null;
  score: number | null;
  duration_ms: number | null;
  inserted_at: string | null;
  result?: { viewer_html?: string | null; [key: string]: unknown } | null;
  /** Only in run:request details. */
  solution?: Solution | null;
  /** Reported back by the viewer iframe (set_current_user_id_result). */
  place?: number | null;
  /** Set once run:request answered for this run. */
  details_loaded?: boolean;
}

/** `group_tournament:run_updated` (GroupTask.Context broadcast). */
export interface RunUpdate {
  group_tournament_id: number;
  user_id: number | null;
  run_id: number;
  status: string;
  score: number | null;
  duration_ms: number | null;
  kind: RunKind;
  slice_index: number | null;
  round_position: number | null;
  player_ids: number[] | null;
  inserted_at: string | null;
}

export interface ExternalSetup {
  state: string | null;
  repo_state: string | null;
  role_state: string | null;
  secret_state: string | null;
  repo_slug: string | null;
  repo_url: string | null;
  role: string | null;
  secret_key: string | null;
  secret_group: string | null;
  last_error: Record<string, unknown> | null;
}

export interface Invite {
  id?: number;
  state: 'creating' | 'pending' | 'accepted' | 'failed' | 'loading' | string;
  invite_link?: string | null;
  expires_at?: string | null;
}

export interface Lang {
  slug: string;
  name: string;
  version?: string | null;
}

/** Event branding stored in group_tournament.meta (admin form, snake_case keys). */
export interface TournamentMeta {
  tournament_details_url?: string;
  tournament_details_label?: string;
  task_info_label?: string;
  task_info_icon_url?: string;
  task_duration_label?: string;
  task_duration_icon_url?: string;
  steps_title?: string;
  step1_label?: string;
  step1_button_label?: string;
  step2_label?: string;
  step2_button_label?: string;
}

/** The state snapshot in the join reply and the REST payload. */
export interface Snapshot {
  group_tournament: GroupTournament;
  current_player: { lang: string | null } | null;
  solution_history: Solution[];
  runs: Run[];
  leaderboard?: LeaderboardEntry[];
  langs: Lang[];
}

export interface JoinReply {
  status: string;
  invite: Invite;
  require_invitation: boolean;
  run_on_external_platform: boolean;
  platform_error?: string | null;
  external_setup: ExternalSetup | null;
  snapshot: Snapshot;
}

export interface InviteUpdate {
  invite: Invite;
  platform_error: string | null;
  external_setup: ExternalSetup | null;
}

export interface StatusUpdate {
  status: string;
  group_tournament?: GroupTournament;
  leaderboard?: LeaderboardEntry[];
}

export interface RestPayload extends Snapshot {
  can_moderate: boolean;
  external_setup: ExternalSetup | null;
}
