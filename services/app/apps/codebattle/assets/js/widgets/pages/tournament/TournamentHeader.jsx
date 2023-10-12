import React, { memo, useMemo } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';
import { useSelector } from 'react-redux';

import CopyButton from '../../components/CopyButton';
import GameLevelBadge from '../../components/GameLevelBadge';
import Loading from '../../components/Loading';
import TournamentType from '../../components/TournamentType';
import TournamentStates from '../../config/tournament';
import * as selectors from '../../selectors';
import useTimer from '../../utils/useTimer';

import JoinButton from './JoinButton';
import TournamentMainControlButtons from './TournamentMainControlButtons';

const getIconByAccessType = accessType => (accessType === 'token' ? 'lock' : 'unlock');

const getBadgeTitle = (state, breakState) => {
  if (state === TournamentStates.active) {
    return breakState === 'off' ? 'Active' : 'Round break';
  }

  switch (state) {
    case TournamentStates.waitingParticipants: return 'Waiting Participants';
    case TournamentStates.cancelled: return 'Cancelled';
    case TournamentStates.finished: return 'Finished';
    default: return 'Loading';
  }
};

const getDescriptionByState = state => {
  switch (state) {
    case TournamentStates.cancelled:
      return 'The tournament is cancelled';
    case TournamentStates.finished:
      return 'The tournament is finished';
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
      The tournament will start in&nbsp;
      {duration}
    </span>
  ) : (
    <span>The tournament will start soon</span>
  );
}

function TournamentStateDescription({
  state, startsAt, isOnline,
}) {
  if (state === TournamentStates.waitingParticipants) {
    return (
      <TournamentTimer startsAt={startsAt} isOnline={isOnline} />
    );
  }

  return getDescriptionByState(state);
}

function TournamentHeader({
  id: tournamentId,
  state,
  breakState,
  startsAt,
  type,
  accessType,
  accessToken,
  isLive,
  name,
  players,
  playersCount,
  playersLimit,
  creatorId,
  currentUserId,
  level,
  isOnline = false,
  isOver = false,
}) {
  const isAdmin = useSelector(selectors.currentUserIsAdminSelector);
  const canModerate = useMemo(
    () => creatorId === currentUserId || isAdmin,
    [creatorId, currentUserId, isAdmin],
  );
  const stateBadgeTitle = useMemo(
    () => getBadgeTitle(state, breakState),
    [state, breakState],
  );
  const stateClassName = cn('badge mr-2', {
    'badge-warning': state === TournamentStates.waitingParticipants,
    'badge-success': breakState === 'off' || state === TournamentStates.finished,
    'badge-light': state === TournamentStates.cancelled,
    'badge-danger': breakState === 'on',
  });

  return (
    <>
      <div className="col bg-white shadow-sm rounded-lg p-2">
        <div className="d-flex flex-column flex-lg-row justify-content-between border-bottom">
          <div className="d-flex align-items-center pb-2">
            <h2
              title={name}
              className="pb-1 m-0 text-capitalize text-nowrap cb-overflow-x-auto cb-overflow-y-hidden"
            >
              {name}
            </h2>
            <div
              className="text-center ml-3"
              data-toggle="tooltip"
              data-placement="right"
              title="Tournament level"
            >
              <GameLevelBadge level={level} />
            </div>
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
          {!isOver && isLive && (
            <div className="d-flex justify-items-center pb-2">
              {type !== 'team' && (
                <JoinButton
                  isShow={isLive && state !== TournamentStates.active}
                  isParticipant={!!players[currentUserId]}
                  disabled={!isOnline || !isLive}
                />
              )}
              {canModerate && (
                <TournamentMainControlButtons
                  accessType={accessType}
                  tournamentId={tournamentId}
                  canStart={
                    state === TournamentStates.waitingParticipants
                    && playersCount > 0
                  }
                  canRestart={
                    state === TournamentStates.active
                    || state === TournamentStates.finished
                    || state === TournamentStates.cancelled
                  }
                  disabled={!isOnline}
                />
              )}
            </div>
          )}
        </div>
        <div className="d-flex small text-nowrap text-muted mt-1 cb-grid-divider">
          <div title={type} className="d-flex align-items-center mr-2">
            Mode:
            <span className="ml-2">
              <TournamentType type={type} />
            </span>
          </div>
          <div
            title={`Players limit is ${playersLimit}`}
            className="d-flex align-items-center"
          >
            {`Players limit: ${playersLimit}`}
          </div>
          {canModerate && accessType === 'token' && (
            <div className="d-flex input-group ml-2">
              <div title="Access token" className="input-group-prepend">
                <span className="input-group-text">
                  <FontAwesomeIcon icon="key" />
                </span>
              </div>
              <CopyButton
                className="btn btn-secondary rounded-right"
                value={accessToken}
                disabled={!isLive}
              />
            </div>
          )}
        </div>
      </div>
      <div className="col bg-white shadow-sm rounded-lg p-2 mt-2">
        <p className="h5 mb-0">
          <span className={stateClassName}>{stateBadgeTitle}</span>
          <span className="text-nowrap">
            <TournamentStateDescription
              state={state}
              startsAt={startsAt}
              isLive={isLive}
              isOver={isOver}
              isOnline={isOnline}
            />
          </span>
        </p>
      </div>
    </>
  );
}

export default memo(TournamentHeader);
