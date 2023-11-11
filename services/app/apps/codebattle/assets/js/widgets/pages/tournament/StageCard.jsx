import React, {
 memo, useEffect,
} from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';
// import { useDispatch } from 'react-redux';

import MatchStateCodes from '../../config/matchStates';
import { tournamentEmptyOpponentUrl } from '../../utils/urlBuilders';
import useMatchesStatistics from '../../utils/useMatchesStatistics';

import StageTitle from './StageTitle';

function StageStatus({
  playerId,
  matchList,
}) {
  const [player, opponent] = useMatchesStatistics(playerId, matchList);
  if (
    player.winMatches.length === opponent.winMatches.length
    && player.score === opponent.score
    && player.avgTests === opponent.avgTests
    && player.avgDuration === opponent.avgDuration
  ) {
    return <span className="text-secondary">Draw</span>;
  }

  if (
    player.score > opponent.score
    || (player.score === opponent.score
      && player.winMatches.length > opponent.winMatches.length)
    || (player.winMatches.length === opponent.winMatches.length
      && player.score === opponent.score
      && player.avgTests > opponent.avgTests)
    || (player.winMatches.length === opponent.winMatches.length
      && player.score === opponent.score
      && player.avgTests === opponent.avgTests
      && player.avgDuration > opponent.avgDuration)
  ) {
    return <span className="text-success">You win</span>;
  }

  return <span className="text-success">You lose</span>;
}

function StageCard({
  playerId,
  opponentId,
  stage,
  stagesLimit,
  players,
  lastGameId,
  lastMatchState,
  matchList,
}) {
  // const dispatch = useDispatch();
  const opponent = players[opponentId];

  const cardInfoClassName = cn(
    'd-flex flex-column justify-content-center pl-0 pl-md-3 pl-lg-3 pl-xl-3',
    'align-items-center align-items-md-baseline align-items-lg-baseline align-items-xl-baseline',
  );

  useEffect(() => {
    if (!opponent) {
      // dispatch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="d-flex flex-column flex-md-row flex-lg-row flex-xl-row p-2 w-100"
    >
      {opponent ? (
        <>
          <img
            alt={`${opponent.name} avatar`}
            src={opponent.avatarUrl}
            className="d-none d-md-block d-lg-block d-xl-block align-self-center cb-tournament-profile-avatar rounded p-2"
          />
          <div className={cardInfoClassName}>
            <h6 className="p-1">
              {'Stage: '}
              <StageTitle stage={stage} stagesLimit={stagesLimit} hideDescription />
            </h6>
            <h6 className="p-1">{`Opponent: ${opponent.name}`}</h6>
            <h6 className="p-1">
              {'Status: '}
              {lastMatchState === MatchStateCodes.playing ? (
                <span className="text-primary">Active</span>
              ) : (
                <StageStatus
                  playerId={playerId}
                  matchList={matchList}
                />
              )}
            </h6>
            <div className="d-flex">
              <a
                href={`/games/${lastGameId}`}
                className="btn btn-primary rounded-lg m-1 px-4"
              >
                <FontAwesomeIcon className="mr-2" icon="eye" />
                Open match
              </a>
            </div>
          </div>
        </>
      ) : (
        <>
          <img
            alt="Waiting opponent avatar"
            src={tournamentEmptyOpponentUrl}
            className="d-none d-md-block d-lg-block d-xl-block align-self-center cb-tournament-profile-avatar bg-gray rounded p-3"
          />
          <div className="d-flex flex-column justify-content-center pl-0 pl-md-3 pl-lg-3 pl-xl-3">
            <h6 className="p-1">
              {'Stage: '}
              <StageTitle stage={stage} stagesLimit={stagesLimit} hideDescription />
            </h6>
            <h6 className="p-1">Opponent: ?</h6>
            <h6 className="p-1">
              {'Status: '}
              <span className="text-warning">Waiting</span>
            </h6>
            <h6 className="p-1 text-muted">Wait round starts</h6>
          </div>
        </>
      )}
    </div>
  );
}

export default memo(StageCard);
