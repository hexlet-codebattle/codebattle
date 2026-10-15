import type { EventInfo, EventStage, UserEvent, UserStageStatus } from './types';

/** One dashboard row: an event stage merged with the user's progress in it (legacy participantDataSelector). */
export interface ParticipantStage {
  slug: string;
  name: string;
  dates: string | null;
  type: EventStage['type'];
  status: EventStage['status'];
  userStatus: UserStageStatus | null;
  tournamentId: number | null;
  groupTournamentId: number | null;
  /** The stage is active and the user may still act on it (tournament CTA / entrance result). */
  available: boolean;
  passed: boolean;
  placeInTotal: number | null;
  placeInCategory: number | null;
  gamesCount: number | null;
  winsCount: number | null;
  aiScore: number | null;
  maxScore: number | null;
  tournamentSeconds: number;
  groupTournamentSeconds: number;
  actionText: string | null;
  confirmationText: string | null;
}

const positive = (value: number | null | undefined) => (value ? value : null);

export function buildParticipantStages(event: EventInfo, userEvent: UserEvent | null): ParticipantStage[] {
  return (event.stages ?? []).map((stage) => {
    const userStage = userEvent?.stages?.find((item) => item.slug === stage.slug);
    const userStatus = userStage?.status ?? null;

    // Entrance stages stay visible once completed (Passed / Not passed);
    // tournament stages drop their CTA when the user is done.
    const allowed: (UserStageStatus | null)[] =
      stage.type === 'entrance' ? ['pending', 'started', 'completed', null] : ['pending', 'started', null];

    const tournamentId = userStage?.tournament_id || stage.tournament_id || null;
    const groupTournamentId = userStage?.group_tournament_id || stage.group_tournament_id || null;
    const isGlobal = stage.type === 'tournament' && stage.playing_type === 'global';
    const gamesCount = positive(userStage?.games_count);

    return {
      slug: stage.slug,
      name: stage.name,
      dates: stage.dates,
      type: stage.type,
      status: stage.status,
      userStatus,
      tournamentId,
      groupTournamentId,
      available: stage.status === 'active' && allowed.includes(userStatus) && (!isGlobal || !!tournamentId),
      passed: userStage?.entrance_result === 'passed',
      placeInTotal: positive(userStage?.place_in_total_rank),
      placeInCategory: positive(userStage?.place_in_category_rank),
      gamesCount,
      // Played games but no wins reads "0/N", nothing played reads "—".
      winsCount: gamesCount === null ? null : (userStage?.wins_count ?? 0),
      aiScore: typeof userStage?.group_tournament_score === 'number' ? userStage.group_tournament_score : null,
      maxScore:
        typeof userStage?.group_tournament_total_score === 'number' ? userStage.group_tournament_total_score : null,
      tournamentSeconds: userStage?.time_spent_in_seconds || 0,
      groupTournamentSeconds: userStage?.group_tournament_time_spent_in_seconds || 0,
      actionText: stage.action_button_text,
      confirmationText: stage.confirmation_text,
    };
  });
}

/** The active stage the user hasn't finished yet that already has a tournament to go to. */
export const findPendingStage = (stages: ParticipantStage[]) =>
  stages.find(
    (stage) =>
      stage.status === 'active' && stage.userStatus !== 'completed' && (stage.groupTournamentId || stage.tournamentId),
  );

const pad = (value: number) => String(value).padStart(2, '0');

/** "HH:MM:SS", or null for nothing spent. */
export function formatDuration(seconds: number) {
  if (seconds <= 0) return null;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${pad(hours)}:${pad(minutes)}:${pad(Math.floor(seconds % 60))}`;
}
