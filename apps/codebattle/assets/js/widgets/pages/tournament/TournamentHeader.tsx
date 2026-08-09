import React, { memo, useContext, useMemo } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Badge, Box, Button, Flex, Group, Stack, Text, Title } from '@mantine/core';
import cn from 'classnames';
import moment from 'moment';

import CustomEventStylesContext from '@/components/CustomEventStylesContext';
import getIconForGrade from '@/components/icons/Grades';
import { getRankingPoints, grades } from '@/config/grades';

import i18next from '../../../i18n';
import CopyButton from '../../components/CopyButton';
import TournamentStates from '../../config/tournament';
import TournamentTypes from '../../config/tournamentTypes';
import { localizeTournamentName } from '../../utils/localizeTournamentName';
import useTimer from '../../utils/useTimer';

import JoinButton from './JoinButton';
import TournamentMainControlButtons from './TournamentMainControlButtons';
export const buildTournamentAccessUrl = (tournamentId: number, accessToken: string) => {
  const url = new URL(`/tournaments/${tournamentId}`, window.location.origin);
  url.searchParams.set('access_token', accessToken);

  return url.toString();
};

const getBadgeTitle = (state: string, breakState: string, hideResults: boolean) => {
  if (hideResults && state === TournamentStates.finished) {
    return 'Waiting winner announcements';
  }

  switch (state) {
    case TournamentStates.active:
      return breakState === 'off' ? 'Active' : 'Round break';
    case TournamentStates.waitingParticipants:
      return 'Waiting Participants';
    case TournamentStates.canceled:
      return 'Canceled';
    case TournamentStates.finished:
      return 'Finished';
    default:
      return 'Loading';
  }
};

const getDescriptionByState = (state: string) => {
  switch (state) {
    case TournamentStates.canceled:
      return i18next.t('The tournament is canceled');
    case TournamentStates.finished:
      return i18next.t('The tournament is finished');
    default:
      return '';
  }
};

interface TournamentTimerProps {
  startsAt: string;
  isOnline?: boolean;
}

function TournamentTimer({ startsAt, isOnline }: TournamentTimerProps) {
  const [duration, seconds] = useTimer(startsAt);

  if (!isOnline) {
    return null;
  }

  return Number(seconds) > 0 ? (
    <span>{i18next.t('The tournament will start: %{duration}', { duration })}</span>
  ) : (
    <span>{i18next.t('The tournament will start soon')}</span>
  );
}

interface TournamentRemainingTimerProps {
  startsAt?: string;
  duration?: number;
}

export function TournamentRemainingTimer({ startsAt, duration }: TournamentRemainingTimerProps) {
  const endsAt = useMemo(() => moment.utc(startsAt).add(duration, 'seconds'), [startsAt, duration]);
  const [time, seconds] = useTimer(endsAt);

  return Number(seconds) > 0 ? time : '';
}

interface TournamentStateDescriptionProps {
  state: string;
  startsAt: string;
  breakState: string;
  breakDurationSeconds?: number;
  currentRoundTimeoutSeconds?: number;
  lastRoundStartedAt?: string;
  lastRoundEndedAt?: string;
  isLive?: boolean;
  isOver?: boolean;
  isOnline?: boolean;
}

function TournamentStateDescription({
  state,
  startsAt,
  breakState,
  breakDurationSeconds,
  currentRoundTimeoutSeconds,
  lastRoundStartedAt,
  lastRoundEndedAt,
  isOnline,
}: TournamentStateDescriptionProps) {
  if (state === TournamentStates.waitingParticipants) {
    return <TournamentTimer startsAt={startsAt} isOnline={isOnline} />;
  }

  if (state === TournamentStates.active && breakState === 'off') {
    if (!Number.isInteger(currentRoundTimeoutSeconds)) {
      return null;
    }

    return (
      <span>
        {i18next.t('Round ends in ')}
        <TournamentRemainingTimer
          key={lastRoundStartedAt}
          startsAt={lastRoundStartedAt}
          duration={currentRoundTimeoutSeconds}
        />
      </span>
    );
  }

  if (state === TournamentStates.active && breakState === 'on') {
    if (!lastRoundEndedAt || !Number.isInteger(breakDurationSeconds)) {
      return <span>{i18next.t('Next round will start soon')}</span>;
    }

    return (
      <span>
        {i18next.t('Next round will start in ')}
        <TournamentRemainingTimer
          key={lastRoundEndedAt}
          startsAt={lastRoundEndedAt}
          duration={breakDurationSeconds}
        />
      </span>
    );
  }

  return getDescriptionByState(state);
}

interface TournamentHeaderProps {
  id: number;
  state: string;
  streamMode?: boolean;
  breakState: string;
  breakDurationSeconds?: number;
  currentRoundTimeoutSeconds?: number;
  lastRoundStartedAt?: string;
  lastRoundEndedAt?: string;
  startsAt: string;
  type?: string;
  accessType?: string;
  accessToken: string;
  isLive?: boolean;
  name: string;
  players: Record<number, unknown>;
  playersCount: number;
  playersLimit?: number;
  level?: string;
  grade?: string;
  currentUserId: number;
  showBots?: boolean;
  hideResults?: boolean;
  isOnline?: boolean;
  isOver?: boolean;
  canModerate?: boolean;
  toggleShowBots: () => void;
  toggleStreamMode: () => void;
  // Bound to a boolean state setter by the parent, but invoked with a string by
  // the control buttons — kept permissive to preserve the existing runtime wiring.
  handleStartRound: (value: any) => void;
  handleOpenDetails: () => void;
  showHeaderPane?: boolean;
  showAdminPane?: boolean;
}

function TournamentHeader({
  id: tournamentId,
  state,
  streamMode,
  breakState,
  breakDurationSeconds,
  currentRoundTimeoutSeconds,
  lastRoundStartedAt,
  lastRoundEndedAt,
  startsAt,
  type,
  accessType,
  accessToken,
  isLive,
  name,
  players,
  playersCount,
  level,
  grade,
  currentUserId,
  showBots = true,
  hideResults = true,
  isOnline,
  isOver,
  canModerate,
  toggleShowBots,
  toggleStreamMode,
  handleStartRound,
  handleOpenDetails,
  showHeaderPane = true,
  showAdminPane = true,
}: TournamentHeaderProps) {
  const stateBadgeTitle = useMemo(
    () => i18next.t(getBadgeTitle(state, breakState, hideResults)),
    [state, breakState, hideResults],
  );
  const hasCustomEventStyle = useContext(CustomEventStylesContext);

  const customBadgeClass = useMemo(() => {
    if (!hasCustomEventStyle) return undefined;
    if (state === TournamentStates.waitingParticipants) return 'cb-custom-event-badge-warning';
    if (!hideResults && (breakState === 'off' || state === TournamentStates.finished))
      return 'cb-custom-event-badge-success';
    if (state === TournamentStates.canceled) return 'cb-custom-event-badge-light';
    if (breakState === 'on') return 'cb-custom-event-badge-danger';
    if (hideResults && state === TournamentStates.finished) return 'cb-custom-event-badge-primary';
    return undefined;
  }, [hasCustomEventStyle, state, breakState, hideResults]);

  const badgeColor = useMemo(() => {
    if (state === TournamentStates.waitingParticipants) return 'yellow';
    if (!hideResults && (breakState === 'off' || state === TournamentStates.finished))
      return 'green';
    if (state === TournamentStates.canceled) return 'gray';
    if (breakState === 'on') return 'red';
    if (hideResults && state === TournamentStates.finished) return 'blue';
    return 'gray';
  }, [state, breakState, hideResults]);

  const copyBtnClassName = hasCustomEventStyle ? 'cb-custom-event-btn-secondary' : undefined;

  const canStart = isLive && state === TournamentStates.waitingParticipants && playersCount > 0;
  const canStartRound = isLive && state === TournamentStates.active && breakState === 'on';
  const canFinishRound = isLive && state === TournamentStates.active && breakState === 'off';
  const canFinishTournament = state === TournamentStates.active;
  const canRestart =
    !isLive ||
    state === TournamentStates.active ||
    state === TournamentStates.finished ||
    state === TournamentStates.canceled;
  const canToggleShowBots = type === TournamentTypes.show;
  const tournamentAccessUrl = useMemo(
    () => buildTournamentAccessUrl(tournamentId, accessToken),
    [tournamentId, accessToken],
  );
  const showDeadTournamentWarning = canModerate && !isLive;
  const showAdminJoinButton =
    canModerate && [TournamentStates.waitingParticipants, TournamentStates.active].includes(state);
  const showAdminPanel = canModerate && showAdminPane;
  const gradeName = grade || grades.open;
  const isGradeTournament = gradeName !== grades.open;
  const firstPlaceRankingPoints = isGradeTournament ? getRankingPoints(gradeName)[0] : null;
  const tournamentName = localizeTournamentName(name, gradeName);

  return (
    <>
      {showHeaderPane && (
        <Box className="cb-bg-panel shadow-sm cb-rounded p-3 mb-2">
          <Flex direction="column">
            <Flex align="center" mb="md">
              {isGradeTournament && (
                <Box mr="md" style={{ flexShrink: 0 }} aria-label={`${gradeName} grade`}>
                  {getIconForGrade(gradeName)}
                </Box>
              )}
              <Flex direction="column" style={{ minWidth: 0 }}>
                <Title
                  order={2}
                  title={tournamentName}
                  className="cb-tournament-header-title pb-1 m-0 text-capitalize text-nowrap cb-overflow-x-auto cb-overflow-y-hidden"
                >
                  {tournamentName}
                </Title>
                {firstPlaceRankingPoints != null && (
                  <Text c="white" className="text-nowrap">
                    <span className="cb-tournament-points-value">{firstPlaceRankingPoints}</span>
                    <span className="ml-1">{i18next.t('Ranking Points')}</span>
                  </Text>
                )}
              </Flex>
              {accessType === 'token' && (
                <Box title={i18next.t('Private tournament')} ml="xs" ta="center">
                  <FontAwesomeIcon icon="lock" />
                </Box>
              )}
            </Flex>
            <Flex align="center" wrap="wrap" style={{ overflow: 'auto' }}>
              <Badge color={badgeColor} className={customBadgeClass} mr="xs">
                {stateBadgeTitle}
              </Badge>
              <Text fw={700} component="span" className="text-nowrap">
                <TournamentStateDescription
                  state={state}
                  startsAt={startsAt}
                  breakState={breakState}
                  breakDurationSeconds={breakDurationSeconds}
                  currentRoundTimeoutSeconds={currentRoundTimeoutSeconds}
                  lastRoundStartedAt={lastRoundStartedAt}
                  lastRoundEndedAt={lastRoundEndedAt}
                  isLive={isLive}
                  isOver={isOver}
                  isOnline={isOnline}
                />
              </Text>
            </Flex>
            {(playersCount != null || level) && (
              <div className="cb-tournament-header-meta">
                {playersCount != null && (
                  <span className="cb-tournament-header-meta-item">
                    <FontAwesomeIcon className="cb-tournament-header-meta-icon" icon="users" />
                    {i18next.t('%{count} players', { count: playersCount })}
                  </span>
                )}
                {level && (
                  <span className="cb-tournament-header-meta-item text-capitalize">
                    <FontAwesomeIcon className="cb-tournament-header-meta-icon" icon="signal" />
                    {i18next.t(level.charAt(0).toUpperCase() + level.slice(1))}
                  </span>
                )}
              </div>
            )}
          </Flex>
        </Box>
      )}
      {showAdminPanel && (
        <Box className="cb-bg-panel shadow-sm cb-rounded p-3 mb-2 overflow-auto">
          <Flex direction="column">
            <Flex
              direction={{ base: 'column', lg: 'row' }}
              align={{ base: 'stretch', lg: 'flex-start' }}
            >
              {showAdminJoinButton && (
                <Box mb={{ base: 'md', lg: 0 }} mr={{ base: 0, lg: 'md' }}>
                  <JoinButton
                    isShow
                    isShowLeave={state === TournamentStates.waitingParticipants}
                    isParticipant={!!players[currentUserId]}
                    disabled={!isOnline}
                  />
                </Box>
              )}
              {canModerate && (
                <Box style={{ flexGrow: 1 }}>
                  <TournamentMainControlButtons
                    accessType={accessType}
                    streamMode={streamMode}
                    tournamentId={tournamentId}
                    canStart={canStart}
                    canStartRound={canStartRound}
                    canFinishRound={canFinishRound}
                    canFinishTournament={canFinishTournament}
                    canRestart={canRestart}
                    canToggleShowBots={canToggleShowBots}
                    showBots={showBots}
                    hideResults={hideResults}
                    disabled={!isOnline}
                    handleStartRound={handleStartRound}
                    handleOpenDetails={handleOpenDetails}
                    toggleShowBots={toggleShowBots}
                    toggleStreamMode={toggleStreamMode}
                  />
                </Box>
              )}
            </Flex>
            {canModerate && !streamMode && accessType === 'token' && (
              <Flex
                justify="flex-end"
                mt="xs"
                pt="xs"
                className="cb-grid-divider overflow-auto"
                style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}
              >
                <Flex align="center">
                  <Box title={i18next.t('Access token')} mr="xs">
                    <Text
                      component="span"
                      p="xs"
                      className="cb-bg-highlight-panel cb-text cb-rounded"
                    >
                      <FontAwesomeIcon icon="key" />
                    </Text>
                  </Box>
                  <CopyButton
                    className={copyBtnClassName}
                    value={tournamentAccessUrl}
                    disabled={!isLive || !isOnline}
                  />
                </Flex>
              </Flex>
            )}
            {showDeadTournamentWarning && (
              <Box
                mt="xs"
                px="md"
                py="xs"
                className={cn(
                  'rounded small font-weight-bold border',
                  hasCustomEventStyle
                    ? 'cb-bg-highlight-panel cb-border-color cb-text'
                    : 'border-warning text-warning',
                )}
              >
                {i18next.t(
                  'Tournament process is dead. Click Restart to make it live again so users can join.',
                )}
              </Box>
            )}
          </Flex>
        </Box>
      )}
    </>
  );
}

export default memo(TournamentHeader);
