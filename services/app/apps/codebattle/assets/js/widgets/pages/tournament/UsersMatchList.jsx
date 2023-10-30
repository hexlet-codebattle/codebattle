import React, { memo } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';
import { useSelector } from 'react-redux';

import useRoundStatistics from '@/utils/useRoundStatistics';

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

function UsersMatchList({ currentUserId, playerId, matches }) {
  const [player] = useRoundStatistics(playerId, matches);

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
      {matches.length > 0 && (
        <div className="d-flex py-2 border-bottom overflow-auto">
          <span className="ml-2">
            {'Wins: '}
            {player.winMatches.length}
          </span>
          <span className="ml-1 pl-1 border-left">
            {'Round Score: '}
            {Math.ceil(player.score)}
          </span>
          <span className="ml-1 pl-1 border-left">
            {'AVG Tests: '}
            {Math.ceil(player.avgTests)}
            %
          </span>
          <span className="ml-1 pl-1 border-left">
            {'AVG Duration: '}
            {Math.ceil(player.avgDuration)}
            {' sec'}
          </span>
        </div>
      )}
      {matches.map((match, index) => {
        const matchClassName = cn(
          'd-flex flex-column flex-xl-row flex-lg-row flex-md-row',
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
              <div className="d-flex flex-column flex-xl-row flex-lg-row flex-md-row flex-sm-row">
                <div className="d-flex align-items-center">
                  {match.winnerId === match.playerIds[0] && (
                    <FontAwesomeIcon className="text-warning mx-2" icon="trophy" />
                  )}
                  <UserTournamentInfo userId={match.playerIds[0]} />
                </div>
                <span className="px-2 pl-5 pl-xl-2 pl-lg-2 pl-md-2 pl-sm-2">VS</span>
                <div className="d-flex align-items-center">
                  {match.winnerId === match.playerIds[1] && (
                    <FontAwesomeIcon className="text-warning mx-2" icon="trophy" />
                  )}
                  <UserTournamentInfo userId={match.playerIds[1]} />
                </div>
              </div>
            </div>
            <div className="d-flex justify-content-end ml-lg-2 ml-xl-2">
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
