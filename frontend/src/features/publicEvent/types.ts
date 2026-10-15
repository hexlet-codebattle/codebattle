// Props of PublicEventController.show (Codebattle.Event / Codebattle.UserEvent JSON encoders).

export type EventStageStatus = 'pending' | 'passed' | 'active';
export type EventStageType = 'tournament' | 'entrance';
export type UserStageStatus = 'pending' | 'started' | 'completed' | 'failed' | 'passed';

export interface EventStage {
  slug: string;
  name: string;
  dates: string | null;
  status: EventStageStatus;
  type: EventStageType;
  playing_type: 'single' | 'global' | null;
  tournament_id: number | null;
  group_tournament_id: number | null;
  action_button_text: string | null;
  confirmation_text: string | null;
  next_round_text: string | null;
}

export interface EventInfo {
  id: number;
  slug: string;
  title: string | null;
  description: string | null;
  ticker_text: string | null;
  starts_at: string | null;
  stages: EventStage[];
}

export interface UserEventStage {
  slug: string;
  status: UserStageStatus | null;
  tournament_id: number | null;
  group_tournament_id: number | null;
  tournament_finished: boolean;
  group_tournament_finished: boolean;
  entrance_result: 'passed' | 'not_passed' | null;
  place_in_total_rank: number | null;
  place_in_category_rank: number | null;
  group_tournament_score: number | null;
  group_tournament_total_score: number | null;
  games_count: number | null;
  wins_count: number | null;
  time_spent_in_seconds: number | null;
  group_tournament_time_spent_in_seconds: number | null;
}

export interface UserEvent {
  id: number;
  status: string;
  stages: UserEventStage[];
}

export interface PublicEventProps {
  event: { event: EventInfo; user_event: UserEvent | null };
  external_platform_login_url?: string | null;
  external_platform_name?: string | null;
  external_platform_profile_url_template?: string | null;
}
