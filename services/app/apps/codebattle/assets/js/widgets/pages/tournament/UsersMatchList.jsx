import React, { memo, useCallback } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';
import { useDispatch, useSelector } from 'react-redux';

import useMatchesStatistics from '@/utils/useMatchesStatistics';

import Loading from '../../components/Loading';
import UserInfo from '../../components/UserInfo';
import { toggleBanUser } from '../../middlewares/Tournament';

import MatchAction from './MatchAction';
import TournamentMatchBadge from './TournamentMatchBadge';

function UserTournamentInfo({ userId }) {
  const user = useSelector(state => state.tournament.players[userId]);

  if (!user) {
    return <Loading adaptive />;
  }

  return <UserInfo user={user} hideOnlineIndicator />;
}

function UsersMatchList({
  currentUserId,
  playerId,
  isBanned,
  canBan,
  matches,
  hideStats = false,
}) {
  const dispatch = useDispatch();

  const [player] = useMatchesStatistics(playerId, matches);
  const handleToggleBanUser = useCallback(() => {
    dispatch(toggleBanUser(playerId, !isBanned));
  }, [playerId, isBanned, dispatch]);

  if (matches.length === 0) {
    return (
      <div
        className="d-flex flex-colum justify-content-center align-items-center p-2"
      >
        No Matches Yet
      </div>
    );
  }

  return (
    <div className="d-flex flex-column">
      {!hideStats && matches.length > 0 && (
        <div className="d-flex py-2 border-bottom align-items-center overflow-auto">
          <span className="ml-2">
            {'Wins: '}
            {player.winMatches.length}
          </span>
          <span className="ml-1 pl-1 border-left border-dark">
            {'Round Score: '}
            {Math.ceil(player.score)}
          </span>
          <span className="ml-1 pl-1 border-left border-dark">
            {'AVG Tests: '}
            {Math.ceil(player.avgTests)}
            %
          </span>
          <span className="ml-1 pl-1 border-left border-dark">
            {'AVG Duration: '}
            {Math.ceil(player.avgDuration)}
            {' sec'}
          </span>
          {canBan && (
            <button
              type="button"
              className="btn btn-sm btn-danger rounded-lg px-1 mx-1"
              onClick={handleToggleBanUser}
            >
              {isBanned ? (
                <>
                  <FontAwesomeIcon className="mr-2" icon="ban" />
                  Unban user
                </>
              ) : (
                <>
                  <FontAwesomeIcon className="mr-2" icon="ban" />
                  Ban User
                </>
              )}
            </button>
          )}
        </div>
      )}
      {matches.map(match => {
        const matchClassName = cn(
          'd-flex flex-column flex-xl-row flex-lg-row flex-md-row',
          'justify-content-between border-bottom p-2',
        );
        const currentUserIsPlayer = currentUserId === match.playerIds[0]
          || currentUserId === match.playerIds[1];
        const isWinner = playerId === match.winnerId;

        return (
          <div
            key={match.id}
            className={matchClassName}
          >
            <div className="d-flex align-items-center justify-content-between">
              <span className="d-flex align-items-center">
                <TournamentMatchBadge
                  matchState={match.state}
                  isWinner={isWinner}
                  currentUserIsPlayer={currentUserIsPlayer}
                />
              </span>
              <div className="d-flex flex-column flex-xl-row flex-lg-row flex-md-row flex-sm-row">
                <div className="d-flex align-items-center">
                  {match.winnerId === match.playerIds[0] && (
                    <FontAwesomeIcon className="text-warning mx-1" icon="trophy" />
                  )}
                  <UserTournamentInfo userId={match.playerIds[0]} />
                </div>
                <span className="px-2 pl-5 pl-xl-2 pl-lg-2 pl-md-2 pl-sm-2">VS</span>
                <div className="d-flex align-items-center">
                  {match.winnerId === match.playerIds[1] && (
                    <FontAwesomeIcon className="text-warning mx-1" icon="trophy" />
                  )}
                  <UserTournamentInfo userId={match.playerIds[1]} />
                </div>
              </div>
            </div>
            <div className="d-flex justify-content-center ml-lg-2 ml-xl-2">
              <MatchAction
                match={match}
                currentUserIsPlayer={currentUserIsPlayer}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default memo(UsersMatchList);
