import React, { useMemo, memo } from 'react';
import _ from 'lodash';

import TournamentStates from '../config/tournament';
import UserInfo from '../containers/UserInfo';

const getLinkParams = (match, currentUserId) => {
  const isParticipant = match.players.some(({ id }) => id === currentUserId);

  switch (true) {
    case match.state === 'waiting' && isParticipant:
      return ['Wait', 'bg-warning'];
    case match.state === 'active' && isParticipant:
      return ['Join', 'bg-warning'];
    case isParticipant:
      return ['Show', 'x-bg-gray'];
    default:
      return ['Show', ''];
  }
};

const IndividualMatches = ({
 state, matches, playersCount = 0, currentUserId,
}) => {
  const roundsCount = useMemo(() => Math.log2(playersCount), [playersCount]);
  const roundsRange = useMemo(() => {
      if (roundsCount > 0) {
        return _.range(roundsCount);
      }

      return [];
  }, [roundsCount]);

  if (state === TournamentStates.waitingParticipants || state === TournamentStates.upcoming) {
    return (
      <h1>
        {state}
        ...
      </h1>
    );
  }

  return (
    <>
      <div className="d-flex justify-content-around">
        {roundsRange.map(round => {
          const tournamentStage = playersCount / (2 ** (round + 1));
          const title = tournamentStage === 1 ? 'Final' : `1/${tournamentStage}`;

          return <h4>{title}</h4>;
        })}
      </div>

      <div className="bracket">
        {roundsRange.map(round => (
          <div className="round">
            {matches[round].map(match => (
              <div className="match">
                <div className="match__content bg-light">
                  <div
                    className={`d-flex p-1 border border-success ${getLinkParams(match, currentUserId)[1]}`}
                  >
                    <div className="d-flex flex-column justify-content-around align-items-center">
                      <p>{match.state}</p>
                      <a
                        href="/games/#{@match.game_id}"
                        className="btn btn-success m-1"
                      >
                        {getLinkParams(match, currentUserId)[0]}
                      </a>
                    </div>
                    <div className="d-flex flex-column justify-content-around">
                      <div className={`tournament-bg-${match.state}`}>
                        <UserInfo user={match.players[0]} hideOnlineIndicator />
                      </div>
                      <div className={`tournament-bg-${match.state}`}>
                        <UserInfo user={match.players[1]} hideOnlineIndicator />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              ))}
          </div>
        ))}
      </div>
    </>
  );
};

export default memo(IndividualMatches);
