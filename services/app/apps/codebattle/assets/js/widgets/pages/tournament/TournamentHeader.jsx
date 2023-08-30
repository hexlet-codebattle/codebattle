import React, {
  memo,
  useMemo,
} from 'react';
import cn from 'classnames';

import { useSelector } from 'react-redux';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import TournamentStates from '../../config/tournament';
import JoinButton from './JoinButton';
import TournamentMainControlButtons from './TournamentMainControlButtons';
import GameLevelBadge from '../../components/GameLevelBadge';
import * as selectors from '../../selectors';
import Loading from '../../components/Loading';
import CopyButton from '../../components/CopyButton';
import TournamentType from '../../components/TournamentType';

const getIconByAccessType = accessType => (
  accessType === 'token'
    ? 'lock'
    : 'unlock'
);

function TournamentHeader({
  id: tournamentId,
  state,
  type,
  accessType,
  accessToken,
  isLive,
  name,
  players,
  playersCount,
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

  return (
    <>
      <div className="d-flex flex-column flex-sm-row align-items-begin justify-content-between border-bottom">
        <div className="d-flex align-items-center pb-2">
          <h2 title={name} className="m-0 text-capitalize text-nowrap overflow-auto">{name}</h2>
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
          <div
            className="d-flex justify-items-center pb-2"
          >
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
                disabled={!isOnline}
              />
            )}
          </div>
        )}
      </div>
      <div className="d-flex small text-nowrap text-muted mt-2">
        <div
          title={type}
          className="d-flex align-items-center"
        >
          Mode:
          <span className="ml-2">
            <TournamentType type={type} />
          </span>
        </div>
        {canModerate && accessType === 'token' && (
          <div className="d-flex input-group ml-2">
            <div title="Access token" className="input-group-prepend">
              <span className="input-group-text"><FontAwesomeIcon icon="key" /></span>
            </div>
            <CopyButton
              className="btn btn-secondary rounded-right"
              value={accessToken}
              disabled={!isLive}
            />
          </div>
        )}
      </div>
    </>
  );
}

export default memo(TournamentHeader);
