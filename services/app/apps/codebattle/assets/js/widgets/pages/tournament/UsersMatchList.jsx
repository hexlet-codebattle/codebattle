import React, { memo, useCallback } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';
import moment from 'moment';
import { useDispatch, useSelector } from 'react-redux';

import useMatchesStatistics from '@/utils/useMatchesStatistics';

import Loading from '../../components/Loading';
import UserInfo from '../../components/UserInfo';

import MatchAction from './MatchAction';
import TournamentMatchBadge from './TournamentMatchBadge';

export const toLocalTime = time => moment.utc(time).local().format('HH:mm:ss');

const matchClassName = cn(
  'd-flex flex-column flex-xl-row flex-lg-row flex-md-row',
  'justify-content-between border-bottom p-2',
);
const matchInfoClassName = cn(
  'd-flex',
  'flex-column flex-xl-row flex-lg-row flex-md-row',
  'align-items-center justify-content-between',
);

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
  canModerate,
  matches,
  hideStats = false,
  hideBots = false,
}) {
  const dispatch = useDispatch();

  const [player] = useMatchesStatistics(playerId, matches);

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
        </div>
      )}
      {matches.map(match => {
        const currentUserIsPlayer = currentUserId === match.playerIds[0]
          || currentUserId === match.playerIds[1];
        const isWinner = playerId === match.winnerId;
        const matchPlayerIds = hideBots
          ? match.playerIds.filter(id => id >= 0)
          : match.playerIds;
        const matchResult = match.playerResults[playerId];

        return (
          <div
            key={match.id}
            className={matchClassName}
          >
            <div className={matchInfoClassName}>
              <div
                className="d-flex align-items-center justify-content-center w-100 p-0 px-2 p-sm-1"
              >
                <span className="d-flex align-items-center">
                  <TournamentMatchBadge
                    matchState={match.state}
                    isWinner={isWinner}
                    currentUserIsPlayer={currentUserIsPlayer}
                  />
                </span>
                <div className="d-flex flex-column flex-xl-row flex-lg-row flex-md-row flex-sm-row">
                  {matchPlayerIds.length === 1 ? (
                    <div className="d-flex align-items-center">
                      {match.winnerId === matchPlayerIds[0] && (
                        <FontAwesomeIcon className="text-warning mx-1" icon="trophy" />
                      )}
                      <UserTournamentInfo userId={matchPlayerIds[0]} />
                    </div>
                  ) : (
                    <>
                      <div className="d-flex align-items-center">
                        {match.winnerId === matchPlayerIds[0] && (
                          <FontAwesomeIcon className="text-warning mx-1" icon="trophy" />
                        )}
                        <UserTournamentInfo userId={matchPlayerIds[0]} />
                      </div>
                      <span className="px-2 pl-5 pl-xl-2 pl-lg-2 pl-md-2 pl-sm-2">VS</span>
                      <div className="d-flex align-items-center">
                        {match.winnerId === matchPlayerIds[1] && (
                          <FontAwesomeIcon className="text-warning mx-1" icon="trophy" />
                        )}
                        <UserTournamentInfo userId={matchPlayerIds[1]} />
                      </div>
                    </>
                  )}
                </div>
              </div>
              {matchResult && matchResult.result !== 'undefined' && (
                <div
                  className="d-flex align-items-center justify-content-center w-100 p-0 p-sm-1"
                >
                  <span
                    title="Match score"
                    className="text-nowrap mx-2"
                  >
                    <FontAwesomeIcon className="text-secondary mr-2" icon="trophy" />
                    {matchResult.score}
                  </span>
                  <span
                    title="Match success tests percent"
                    className="text-nowrap mx-2"
                  >
                    <FontAwesomeIcon className="text-success mr-2" icon="tasks" />
                    {matchResult.resultPercent}
                  </span>
                  {matchResult.result === 'won' && (
                    <span
                      title="Match duration seconds"
                      className="text-nowrap mx-2"
                    >
                      <FontAwesomeIcon className="text-primary mr-2" icon="stopwatch" />
                      {matchResult.durationSec}
                    </span>
                  )}

                  {match.startedAt && (
                    <span
                      title="Match finished at"
                      className="text-nowrap ml-2"
                    >
                      <FontAwesomeIcon className="text-primary mr-2" icon="flag-checkered" />
                      {toLocalTime(match.startedAt)}
                    </span>
                  )}
                  {match.finishedAt && (
                    <span
                      title="Match finished at"
                      className="text-nowrap mr-2"
                    >
                      <span className="mx-2">-</span>
                      {toLocalTime(match.finishedAt)}
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="d-flex justify-content-center ml-lg-2 ml-xl-2 p-0 px-2 p-sm-1">
              <MatchAction
                match={match}
                canModerate={canModerate}
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
