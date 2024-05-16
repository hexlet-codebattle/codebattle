import React, {
 memo, useEffect,
} from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';
import i18next from 'i18next';
import { useDispatch } from 'react-redux';

import { uploadPlayers } from '@/middlewares/Tournament';

import MatchStateCodes from '../../config/matchStates';
import TournamentTypes from '../../config/tournamentTypes';
import { getCustomEventPlayerDefaultImgUrl, tournamentEmptyPlayerUrl } from '../../utils/urlBuilders';
import useMatchesStatistics from '../../utils/useMatchesStatistics';

import StageTitle from './StageTitle';

function ArenaStageStatus({
  playerId,
  matchList,
  matchState,
}) {
  const [player, opponent] = useMatchesStatistics(playerId, matchList);

  if (matchState === MatchStateCodes.playing) {
    return (
      <span className="cb-custom-event-active-status text-nowrap px-2 my-1">
        {i18next.t('Active match')}
      </span>
    );
  }

  if (
    player.winMatches.length === opponent.winMatches.length
    && player.score === opponent.score
    && player.avgTests === opponent.avgTests
    && player.avgDuration === opponent.avgDuration
  ) {
    return <span className="cb-custom-event-draw-status px-2">{i18next.t('Draw')}</span>;
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
    return <span className="cb-custom-event-win-status px-2">{i18next.t('You win')}</span>;
  }

  return <span className="cb-custom-event-lose-status text-white px-2">{i18next.t('You lose')}</span>;
}

function StageStatus({
  playerId,
  matchList,
  matchState,
}) {
  const [player, opponent] = useMatchesStatistics(playerId, matchList);

  if (matchState === MatchStateCodes.playing) {
    return (
      <span className="text-primary">
        {i18next.t('Active match')}
      </span>
    );
  }

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

  return <span className="text-danger">You lose</span>;
}

function StageCard({
  type,
  playerId,
  opponentId,
  stage,
  stagesLimit,
  players,
  lastGameId,
  lastMatchState,
  matchList,
  isBanned,
}) {
  const dispatch = useDispatch();
  const opponent = players[opponentId];

  const cardInfoClassName = cn(
    'd-flex flex-column justify-content-center pl-0 pl-md-3 pl-lg-3 pl-xl-3',
    'align-items-center align-items-md-baseline align-items-lg-baseline align-items-xl-baseline',
  );

  useEffect(() => {
    if (!opponent && opponentId) {
      dispatch(uploadPlayers([opponentId]));
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
            src={opponent.avatarUrl || getCustomEventPlayerDefaultImgUrl(opponent) || tournamentEmptyPlayerUrl}
            className="d-none d-md-block d-lg-block d-xl-block align-self-center cb-tournament-profile-avatar rounded p-2"
          />
          <div className={cardInfoClassName}>
            {type !== TournamentTypes.arena && (
              <h6 className="p-1">
                {'Stage: '}
                <StageTitle stage={stage} stagesLimit={stagesLimit} hideDescription />
              </h6>
            )}
            <h6 className="p-1">{`${i18next.t('Opponent')}: ${opponent.name}`}</h6>
            {opponent.clanId && (
              <h6 className="p-1">
                {`${i18next.t('Opponent clan')}: ${opponent.clan}`}
              </h6>
            )}
            <h6 className="p-1">
              {`${i18next.t('Status')}: `}
              {
                type === TournamentTypes.arena ? (
                  <ArenaStageStatus
                    playerId={playerId}
                    matchList={matchList}
                    matchState={lastMatchState}
                  />
                ) : (
                  <StageStatus
                    playerId={playerId}
                    matchList={matchList}
                    matchState={lastMatchState}
                  />
                )
              }
            </h6>
            <div className="d-flex">
              {isBanned ? (
                <a href="_blank" className="btn btn-danger rounded-lg m-1 px-4 disabled">
                  <FontAwesomeIcon className="mr-2" icon="ban" />
                  {i18next.t('You banned')}
                </a>
              ) : (
                <a
                  href={`/games/${lastGameId}`}
                  className="btn btn-primary rounded-lg m-1 px-4"
                >
                  <FontAwesomeIcon className="mr-2" icon="eye" />
                  {i18next.t('Open match')}
                </a>
              )}
            </div>
          </div>
        </>
      ) : (
        <>
          <img
            alt="Waiting opponent avatar"
            src={tournamentEmptyPlayerUrl}
            className="d-none d-md-block d-lg-block d-xl-block align-self-center cb-tournament-profile-avatar bg-gray rounded p-3"
          />
          <div className="d-flex flex-column justify-content-center pl-0 pl-md-3 pl-lg-3 pl-xl-3">
            {type !== TournamentTypes.arena && (
              <h6 className="p-1">
                {'Stage: '}
                <StageTitle stage={stage} stagesLimit={stagesLimit} hideDescription />
              </h6>
            )}
            <h6 className="p-1">{`${i18next.t('Opponent')}: ?`}</h6>
            <h6 className="p-1">
              {`${i18next.t('Status')}: `}
              <span className="cb-tournament-status">
                {i18next.t('Waiting')}
              </span>
            </h6>
            <h6 className="p-1 text-muted">
              {i18next.t('Wait round starts')}
            </h6>
          </div>
        </>
      )}
    </div>
  );
}

export default memo(StageCard);
