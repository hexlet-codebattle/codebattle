import React, { useMemo, memo } from 'react';

import reverse from 'lodash/reverse';

import UserInfo from '../../components/UserInfo';

const calcRoundResult = matches => matches.reduce((acc, match) => {
    const [gameResultPlayer1, gameResultPlayer2] = match.players.map(p => p.result);

    if (gameResultPlayer1 === 'won' || gameResultPlayer2 === 'gave_up') {
        return { ...acc, first: acc.first + 1 };
    }
    if (gameResultPlayer2 === 'won' || gameResultPlayer1 === 'gave_up') {
        return { ...acc, second: acc.second + 1 };
    }

    return acc;
}, { first: 0, second: 0 });

const getLinkParams = (match, currentUserId) => {
  const isWinner = match.winnerId === currentUserId;
  const isParticipant = match.players.some(({ id }) => id === currentUserId);

  switch (true) {
    case match.state === 'waiting' && isParticipant:
      return ['Wait', 'bg-warning'];
    case match.state === 'active' && isParticipant:
      return ['Join', 'bg-warning'];
    case isWinner:
      return ['Show', 'bg-warning'];
    case isParticipant:
      return ['Show', 'x-bg-gray'];
    default:
      return ['Show', ''];
  }
};

function TeamMatches({ matches, currentUserId }) {
  const rounds = useMemo(() => reverse(Object.values(matches)), [matches]);

  return (
    <>
      $
      {rounds.map(roundMatches => (
        <div className="col-12 mt-3 py-2 bg-white shadow-sm rounded">
          <div className="row mb-3">
            <div className="col-5">
              <h3 className="font-weight-light mb-0">{`round ${roundMatches[0].roundId}`}</h3>
            </div>
            <div className="col-1 text-center">
              <span className="font-weight-light mb-0">
                {calcRoundResult(roundMatches).first}
              </span>
            </div>
            <div className="col-1 text-center">
              <span className="font-weight-light mb-0">
                {calcRoundResult(roundMatches).second}
              </span>
            </div>
            $
            {roundMatches.map(match => {
              const [player1, player2] = match.players;
              const [linkName, bgClass] = getLinkParams(match, currentUserId);

              return (
                <div className={`row align-items-center py-2 ${bgClass}`}>
                  <div className="col-6">
                    <UserInfo user={player1} hideOnlineIndicator />
                  </div>
                  <div className="col-4">
                    <UserInfo user={player2} hideOnlineIndicator />
                  </div>
                  <div className="col-2 text-right">
                    <a
                      className="btn btn-success"
                      href={`/games/${match.gameId}`}
                    >
                      {linkName}
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}

export default memo(TeamMatches);
