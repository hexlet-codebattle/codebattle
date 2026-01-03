import React, { memo, useContext, useMemo } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';
import i18next from 'i18next';
import moment from 'moment';

import CustomEventStylesContext from '@/components/CustomEventStylesContext';
import useTournamentStats from '@/utils/useTournamentStats';

import CopyButton from '../../components/CopyButton';
import Loading from '../../components/Loading';
import TournamentType from '../../components/TournamentType';
import WaitingRoomStatus from '../../components/WaitingRoomStatus';
import TournamentStates from '../../config/tournament';
import TournamentTypes from '../../config/tournamentTypes';
import useTimer from '../../utils/useTimer';

import JoinButton from './JoinButton';
import TournamentMainControlButtons from './TournamentMainControlButtons';

const getIconByAccessType = (accessType) => (accessType === 'token' ? 'lock' : 'unlock');

const getBadgeTitle = (state, breakState, hideResults) => {
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

const getDescriptionByState = (state) => {
  switch (state) {
    case TournamentStates.canceled:
      return i18next.t('The tournament is canceled');
    case TournamentStates.finished:
      return i18next.t('The tournament is finished');
    default:
      return '';
  }
};

function TournamentTimer({ startsAt, isOnline }) {
  const [duration, seconds] = useTimer(startsAt);

  if (!isOnline) {
    return null;
  }

  return seconds > 0 ? (
    <span>
      {i18next.t('The tournament will start: %{duration}', { duration })}
    </span>
  ) : (
    <span>{i18next.t('The tournament will start soon')}</span>
  );
}

export function TournamentRemainingTimer({ startsAt, duration }) {
  const endsAt = useMemo(
    () => moment.utc(startsAt).add(duration, 'seconds'),
    [startsAt, duration],
  );
  const [time, seconds] = useTimer(endsAt);

  return seconds > 0 ? time : '';
}

function TournamentStateDescription({
  state,
  startsAt,
  breakState,
  breakDurationSeconds,
  matchTimeoutSeconds,
  roundTimeoutSeconds,
  lastRoundStartedAt,
  lastRoundEndedAt,
  isOnline,
}) {
  if (state === TournamentStates.waitingParticipants) {
    return <TournamentTimer startsAt={startsAt} isOnline={isOnline} />;
  }

  if (state === TournamentStates.active && breakState === 'off') {
    return (
      <span>
        {i18next.t('Round ends in ')}
        <TournamentRemainingTimer
          key={lastRoundStartedAt}
          startsAt={lastRoundStartedAt}
          duration={roundTimeoutSeconds || matchTimeoutSeconds}
        />
      </span>
    );
  }

  if (state === TournamentStates.active && breakState === 'on') {
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

function TournamentHeader({
  id: tournamentId,
  state,
  streamMode,
  breakState,
  breakDurationSeconds,
  matchTimeoutSeconds,
  roundTimeoutSeconds,
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
  playersLimit,
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
}) {
  const { taskSolvedCount, maxPlayerTasks, activeGameId } = useTournamentStats({
    type: 'tournament',
  });
  const stateBadgeTitle = useMemo(
    () => i18next.t(getBadgeTitle(state, breakState, hideResults)),
    [state, breakState, hideResults],
  );
  const hasCustomEventStyle = useContext(CustomEventStylesContext);

  const stateClassName = cn(
    'badge mr-2',
    hasCustomEventStyle
      ? {
        'cb-custom-event-badge-warning':
          state === TournamentStates.waitingParticipants,
        'cb-custom-event-badge-success':
          !hideResults
          && (breakState === 'off' || state === TournamentStates.finished),
        'cb-custom-event-badge-light': state === TournamentStates.canceled,
        'cb-custom-event-badge-danger': breakState === 'on',
        'cb-custom-event-badge-primary':
          hideResults && state === TournamentStates.finished,
      }
      : {
        'badge-warning': state === TournamentStates.waitingParticipants,
        'badge-success':
          !hideResults
          && (breakState === 'off' || state === TournamentStates.finished),
        'badge-light': state === TournamentStates.canceled,
        'badge-danger': breakState === 'on',
        'badge-primary': hideResults && state === TournamentStates.finished,
      },
  );
  const copyBtnClassName = cn('btn btn-sm rounded-right', {
    'btn-secondary cb-btn-secondary': !hasCustomEventStyle,
    'cb-custom-event-btn-secondary': hasCustomEventStyle,
  });
  // const backBtnClassName = cn('btn rounded-lg ml-lg-2 mr-2', {
  //   'btn-primary': !hasCustomEventStyle,
  //   'cb-custom-event-btn-primary': hasCustomEventStyle,
  // });

  const canStart = isLive
    && state === TournamentStates.waitingParticipants
    && playersCount > 0;
  const canStartRound = isLive && state === TournamentStates.active && breakState === 'on';
  const canFinishRound = isLive
    && state === TournamentStates.active
    && !['individual', 'team'].includes(type)
    && breakState === 'off';
  const canRestart = !isLive
    || state === TournamentStates.active
    || state === TournamentStates.finished
    || state === TournamentStates.canceled;
  const canToggleShowBots = type === TournamentTypes.show;

  return (
    <>
      <div className="col cb-bg-panel shadow-sm cb-rounded p-2">
        <div className="d-flex flex-column flex-lg-row justify-content-between">
          <div className="d-flex align-items-center pb-2">
            <h2
              title={name}
              className="pb-1 m-0 text-capitalize text-nowrap cb-overflow-x-auto cb-overflow-y-hidden"
            >
              {name}
            </h2>
            <div
              title={
                accessType === 'token'
                  ? 'Private tournament'
                  : 'Public tournament'
              }
              className="text-center ml-2"
            >
              <FontAwesomeIcon icon={getIconByAccessType(accessType)} />
            </div>
            {isOnline ? (
              <div
                title={isLive ? 'Active tournament' : 'Inactive tournament'}
                className={cn('text-center ml-2', {
                  'text-primary': isLive,
                  'text-light': !isLive,
                })}
              >
                <FontAwesomeIcon icon="wifi" />
              </div>
            ) : (
              <div className="text-center ml-2">
                <Loading adaptive />
              </div>
            )}
          </div>
          <div className="d-flex">
            {!streamMode && (
              <div className="d-flex justify-items-center pb-2">
                {/* {!players[currentUserId] && (
                  <a className={backBtnClassName} href="/tournaments">
                    <FontAwesomeIcon className="mr-2" icon="undo" />
                    {i18next.t("Back to tournaments")}
                  </a>
                )} */}
                {type !== 'team' && !isOver && (
                  <div className="d-flex mr-2 mr-lg-0">
                    <JoinButton
                      isShow={
                        state !== TournamentStates.active
                        || type === 'arena'
                        || type === 'swiss'
                      }
                      isShowLeave={
                        type === 'arena' || state !== TournamentStates.active
                      }
                      isParticipant={!!players[currentUserId]}
                      disabled={!isOnline || !isLive}
                    />
                  </div>
                )}
              </div>
            )}
            <div className="d-flex justify-items-center pb-2">
              {canModerate && (
                <TournamentMainControlButtons
                  accessType={accessType}
                  streamMode={streamMode}
                  tournamentId={tournamentId}
                  canStart={canStart}
                  canStartRound={canStartRound}
                  canFinishRound={canFinishRound}
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
              )}
            </div>
          </div>
        </div>
        {canModerate && !streamMode && (
          <div
            className={
              cn(
                'd-flex align-items-center small text-nowrap text-muted mt-1',
                'cb-grid-divider overflow-auto border-top cb-border-color',
              )
            }
          >
            <div title={type} className="d-flex align-items-center">
              Mode:
              <span className="ml-2">
                <TournamentType type={type} />
              </span>
            </div>
            <span className="mx-2">|</span>
            <div
              title={`Players limit is ${playersLimit}`}
              className="d-flex align-items-center"
            >
              {`Players limit: ${playersLimit}`}
            </div>
            <span className="mx-2">|</span>
            <div
              title={`Is live ${isLive}`}
              className="d-flex align-items-center"
            >
              {`Is live: ${isLive}`}
            </div>
            {accessType === 'token' && (
              <>
                <span className="mx-2">|</span>
                <div className="d-flex input-group ml-2">
                  <div title="Access token" className="input-group-prepend">
                    <span className="input-group-text cb-bg-highlight-panel cb-border-color cb-text">
                      <FontAwesomeIcon icon="key" />
                    </span>
                  </div>
                  <CopyButton
                    className={copyBtnClassName}
                    value={accessToken}
                    disabled={!isLive || !isOnline}
                  />
                </div>
              </>
            )}
          </div>
        )}
      </div>
      <div
        className={cn(
          'col cb-bg-panel shadow-sm cb-rounded p-2 mt-2 overflow-auto',
          'd-flex align-items-center justify-content-between',
        )}
      >
        <p className="h5 mb-0 text-nowrap">
          <span className={stateClassName}>{stateBadgeTitle}</span>
          <span className="h6 text-nowrap">
            <TournamentStateDescription
              state={state}
              startsAt={startsAt}
              breakState={breakState}
              breakDurationSeconds={breakDurationSeconds}
              matchTimeoutSeconds={matchTimeoutSeconds}
              roundTimeoutSeconds={roundTimeoutSeconds}
              lastRoundStartedAt={lastRoundStartedAt}
              lastRoundEndedAt={lastRoundEndedAt}
              isLive={isLive}
              isOver={isOver}
              isOnline={isOnline}
            />
          </span>
        </p>
        {type === TournamentTypes.arena
          && state === TournamentStates.active
          && !!players[currentUserId]
          && breakState === 'off' && (
            <div className="d-flex align-items-center">
              <WaitingRoomStatus
                page="tournament"
                taskCount={taskSolvedCount}
                tournamentState={state}
                breakState={breakState}
                maxPlayerTasks={maxPlayerTasks}
                activeGameId={activeGameId}
              />
            </div>
          )}
      </div>
    </>
  );
}

export default memo(TournamentHeader);
