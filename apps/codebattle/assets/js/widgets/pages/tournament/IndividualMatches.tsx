import React, { memo, useMemo } from 'react';

import cn from 'classnames';
import capitalize from 'lodash/capitalize';

import { type Player } from '@/slices/initial';

import i18n from '../../../i18n';
import UserInfo from '../../components/UserInfo';

interface Match {
  gameId: number;
  state: string;
  winnerId: number;
  playerIds: number[];
  roundPosition: number;
  [key: string]: unknown;
}

type MatchesMap = Record<number, Match>;
type PlayersMap = Record<number, Player>;

const RoundTypes = {
  one: 'one',
  two: 'two',
  three: 'three',
  four: 'four',
  quarter: 'quarter',
  semi: 'semi',
  final: 'final',
};

const maxPlayersPerRoundType: Record<string, number> = {
  [RoundTypes.one]: 128,
  [RoundTypes.two]: 64,
  [RoundTypes.three]: 32,
  [RoundTypes.four]: 16,
  [RoundTypes.quarter]: 8,
  [RoundTypes.semi]: 4,
  [RoundTypes.final]: 2,
};

const roundTypesValues = Object.values(RoundTypes);
const maxRoundsCount = roundTypesValues.length;

const getRoundCounts = (playersCount: number) =>
  roundTypesValues.filter((type) => maxPlayersPerRoundType[type] / 2 < playersCount).length;

const getTitleByRoundType = (type: string, playersCount: number) => {
  switch (type) {
    case RoundTypes.one:
      return i18n.t('Round %{number}', { number: 1 });
    case RoundTypes.two: {
      if (maxPlayersPerRoundType[RoundTypes.two] < playersCount) {
        return i18n.t('Round %{number}', { number: 2 });
      }

      return i18n.t('Round %{number}', { number: 1 });
    }
    case RoundTypes.three: {
      if (maxPlayersPerRoundType[RoundTypes.two] < playersCount) {
        return i18n.t('Round %{number}', { number: 3 });
      }
      if (maxPlayersPerRoundType[RoundTypes.three] < playersCount) {
        return i18n.t('Round %{number}', { number: 2 });
      }

      return i18n.t('Round %{number}', { number: 1 });
    }
    case RoundTypes.four: {
      if (maxPlayersPerRoundType[RoundTypes.two] < playersCount) {
        return i18n.t('Round %{number}', { number: 4 });
      }
      if (maxPlayersPerRoundType[RoundTypes.three] < playersCount) {
        return i18n.t('Round %{number}', { number: 3 });
      }
      if (maxPlayersPerRoundType[RoundTypes.four] < playersCount) {
        return i18n.t('Round %{number}', { number: 2 });
      }

      return i18n.t('Round %{number}', { number: 1 });
    }
    default:
      return i18n.t(capitalize(type));
  }
};

const getLinkParams = (match: Match, currentUserId: number): [string, string] => {
  const isWinner = match.winnerId === currentUserId;
  const isParticipant = match.playerIds.includes(currentUserId);
  const cardClassName = 'p-1 border rounded-lg';

  switch (true) {
    case match.state === 'waiting' && isParticipant:
      return ['Wait', cn(cardClassName, 'border-warning')];
    case match.state === 'playing' && isParticipant:
      return ['Join', cn(cardClassName, 'border-winner')];
    case isWinner:
      return ['Show', cn(cardClassName, 'border-winner')];
    case isParticipant:
      return ['Show', cn(cardClassName, 'x-bg-gray border-secondary')];
    default:
      return ['Show', cn(cardClassName, 'border-gray')];
  }
};

const getMatchesByRoundPosition = (matches: MatchesMap, round: number) =>
  Object.values(matches).filter((match) => match.roundPosition === round);

const getResultClass = (match: Match, playerId: number) =>
  match.winnerId === playerId ? 'fa fa-trophy text-warning' : '';

interface RoundProps {
  matches: MatchesMap;
  players: PlayersMap;
  playersCount: number;
  type: string;
  round: number;
  currentUserId: number;
}

function Round({ matches, players, playersCount, type, round, currentUserId }: RoundProps) {
  const showRound = playersCount > maxPlayersPerRoundType[type] / 2;

  const matchesPerRound = useMemo(
    () => (showRound ? getMatchesByRoundPosition(matches, round) : []),
    [matches, round, showRound],
  );

  if (!showRound) {
    return <></>;
  }

  return (
    <div className="round">
      <div className="h4 text-center">{getTitleByRoundType(type, playersCount)}</div>
      <div className="round-inner">
        {matchesPerRound.map((match) => (
          <div key={match.gameId} className="match">
            <div className="match__content">
              {match ? (
                <div className={getLinkParams(match, currentUserId)[1]}>
                  <div className="d-flex justify-content-center align-items-center">
                    <span>{i18n.t(match.state)}</span>
                    <div id={String(match.gameId)}>
                      <a
                        href={`/games/${match.gameId}`}
                        className="btn btn-sm btn-success text-white rounded-lg m-1"
                      >
                        {getLinkParams(match, currentUserId)[0]}
                      </a>
                    </div>
                  </div>
                  <div className="d-flex flex-column justify-content-around">
                    {match.playerIds.map((id) => (
                      <div
                        className={`d-flex align-items-center bg-light tournament-bg-${match.state}`}
                      >
                        <UserInfo user={players[id]} hideOnlineIndicator />
                        <span className={getResultClass(match, id)} />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="d-flex align-items-center justify-content-center x-bg-gray">
                  <p>{i18n.t('Waiting')}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface IndividualMatchesProps {
  matches: MatchesMap;
  players: PlayersMap;
  playersCount?: number;
  currentUserId: number;
}

function IndividualMatches({
  matches,
  players,
  playersCount = 0,
  currentUserId,
}: IndividualMatchesProps) {
  const roundsCount = useMemo(() => getRoundCounts(playersCount), [playersCount]);

  return (
    <div className="overflow-auto mt-2">
      <div className="bracket">
        {roundTypesValues.map((type, index) => (
          <Round
            matches={matches}
            players={players}
            playersCount={playersCount}
            round={roundsCount - maxRoundsCount + index}
            type={type}
            currentUserId={currentUserId}
          />
        ))}
      </div>
    </div>
  );
}

// 7 | [0 - 6] | 6 - 7 + 1

export default memo(IndividualMatches);
