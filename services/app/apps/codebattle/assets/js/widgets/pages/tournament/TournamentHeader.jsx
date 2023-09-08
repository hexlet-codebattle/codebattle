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

import JoinButton from './JoinButton';
import TournamentMainControlButtons from './TournamentMainControlButtons';

const getIconByAccessType = (accessType) => (accessType === 'token' ? 'lock' : 'unlock');

function TournamentHeader({
  accessToken,
  accessType,
  creatorId,
  currentUserId,
  id: tournamentId,
  isLive,
  isOnline = false,
  isOver = false,
  level,
  name,
  players,
  playersCount,
  state,
  type,
}) {
  const isAdmin = useSelector(selectors.currentUserIsAdminSelector);
  const canModerate = useMemo(
    () => creatorId === currentUserId || isAdmin,
    [creatorId, currentUserId, isAdmin],
  );

  return (
    <>
      <div className="d-flex flex-column flex-sm-row align-items-begin justify-content-between border-bottom">
        <div className="d-flex align-items-center pb-2">
          <h2 className="m-0 text-capitalize text-nowrap overflow-auto" title={name}>
            {name}
          </h2>
          <div
            className="text-center ml-3"
            data-placement="right"
            data-toggle="tooltip"
            title="Tournament level"
          >
            <GameLevelBadge level={level} />
          </div>
          <div
            className="text-center ml-2"
            title={accessType === 'token' ? 'Private tournament' : 'Public tournament'}
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
                disabled={!isOnline || !isLive}
                isParticipant={!!players[currentUserId]}
                isShow={isLive && state !== TournamentStates.active}
              />
            )}
            {canModerate && (
              <TournamentMainControlButtons
                accessType={accessType}
                canStart={state === TournamentStates.waitingParticipants && playersCount > 0}
                disabled={!isOnline}
                tournamentId={tournamentId}
              />
            )}
          </div>
        )}
      </div>
      <div className="d-flex small text-nowrap text-muted mt-2">
        <div className="d-flex align-items-center" title={type}>
          Mode:
          <span className="ml-2">
            <TournamentType type={type} />
          </span>
        </div>
        {canModerate && accessType === 'token' && (
          <div className="d-flex input-group ml-2">
            <div className="input-group-prepend" title="Access token">
              <span className="input-group-text">
                <FontAwesomeIcon icon="key" />
              </span>
            </div>
            <CopyButton
              className="btn btn-secondary rounded-right"
              disabled={!isLive}
              value={accessToken}
            />
          </div>
        )}
      </div>
    </>
  );
}

export default memo(TournamentHeader);
