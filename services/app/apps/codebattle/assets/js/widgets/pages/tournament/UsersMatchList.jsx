import React, { memo } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';
import { useSelector } from 'react-redux';

import Loading from '../../components/Loading';
import UserInfo from '../../components/UserInfo';

import MatchAction from './MatchAction';
import TournamentMatchBadge from './TournamentMatchBadge';

function UserTournamentInfo({ userId }) {
  const user = useSelector(state => state.user.users[userId]);

  if (!user) {
    return <Loading adaptive />;
  }

  return <UserInfo user={user} hideOnlineIndicator />;
}

function UsersMatchList({ currentUserId, matches }) {
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
      {matches.map((match, index) => {
        const matchClassName = cn(
          'd-flex flex-column flex-lg-row flex-md-row',
          'justify-content-between border-bottom p-2',
        );
        const currentUserIsPlayer = currentUserId === match.playerIds[0]
          || currentUserId === match.playerIds[1];
        const isWinner = currentUserIsPlayer && match.winnerId === currentUserId;

        return (
          <div
            key={match.id}
            className={matchClassName}
          >
            <div className="d-flex align-items-center justify-content-between">
              <span className="d-flex align-items-center">
                <span className="pr-2">{index}</span>
                <TournamentMatchBadge
                  matchState={match.state}
                  isWinner={isWinner}
                  currentUserIsPlayer={currentUserIsPlayer}
                />
              </span>
              <div className="d-flex flex-column flex-lg-row flex-md-row flex-sm-row">
                <div className="d-flex align-items-center">
                  {match.winnerId === match.playerIds[0] && (
                    <FontAwesomeIcon className="text-warning mx-2" icon="trophy" />
                  )}
                  <UserTournamentInfo userId={match.playerIds[0]} />
                </div>
                <span className="text-center px-2">VS</span>
                <div className="d-flex align-items-center">
                  {match.winnerId === match.playerIds[1] && (
                    <FontAwesomeIcon className="text-warning mx-2" icon="trophy" />
                  )}
                  <UserTournamentInfo userId={match.playerIds[1]} />
                </div>
              </div>
            </div>
            <div className="d-flex justify-content-end ml-lg-2">
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
