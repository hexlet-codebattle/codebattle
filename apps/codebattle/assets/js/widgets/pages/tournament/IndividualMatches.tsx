import React, { memo, useMemo } from 'react';

import { Box, Button, Flex, Text, Title } from '@mantine/core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

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

interface LinkParams {
  text: string;
  style: React.CSSProperties;
  className?: string;
}

const getLinkParams = (match: Match, currentUserId: number): LinkParams => {
  const isWinner = match.winnerId === currentUserId;
  const isParticipant = match.playerIds.includes(currentUserId);
  const baseStyle: React.CSSProperties = {
    padding: '0.25rem',
    border: '1px solid',
    borderRadius: '0.3rem',
  };

  switch (true) {
    case match.state === 'waiting' && isParticipant:
      return { text: 'Wait', style: { ...baseStyle, borderColor: '#ffc107' } };
    case match.state === 'playing' && isParticipant:
    case isWinner:
      return {
        text: 'Join',
        style: { ...baseStyle, border: '2px solid', borderColor: '#c9a56c' },
      };
    case isParticipant:
      return {
        text: 'Show',
        style: { ...baseStyle, borderColor: '#6c757d' },
        className: 'x-bg-gray',
      };
    default:
      return {
        text: 'Show',
        style: { ...baseStyle, border: '2px solid #d9d9d9' },
      };
  }
};

const getMatchesByRoundPosition = (matches: MatchesMap, round: number) =>
  Object.values(matches).filter((match) => match.roundPosition === round);

const getResultIcon = (match: Match, playerId: number) =>
  match.winnerId === playerId ? 'trophy' : null;

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
      <Title order={4} ta="center">
        {getTitleByRoundType(type, playersCount)}
      </Title>
      <div className="round-inner">
        {matchesPerRound.map((match) => {
          const linkParams = getLinkParams(match, currentUserId);

          return (
            <div key={match.gameId} className="match">
              <div className="match__content">
                {match ? (
                  <div className={linkParams.className} style={linkParams.style}>
                    <Flex align="center" justify="center">
                      <Text component="span">{i18n.t(match.state)}</Text>
                      <div id={String(match.gameId)}>
                        <Button
                          size="compact-sm"
                          radius="md"
                          m={4}
                          color="cbSuccess"
                          component="a"
                          href={`/games/${match.gameId}`}
                        >
                          {linkParams.text}
                        </Button>
                      </div>
                    </Flex>
                    <Flex direction="column" justify="space-around">
                      {match.playerIds.map((id) => (
                        <Flex
                          key={id}
                          align="center"
                          style={{ background: 'var(--color-gray-0)' }}
                          className={`tournament-bg-${match.state}`}
                        >
                          <UserInfo user={players[id]} hideOnlineIndicator />
                          {getResultIcon(match, id) && (
                            <FontAwesomeIcon
                              icon={getResultIcon(match, id) as never}
                              style={{ color: '#ffc107' }}
                            />
                          )}
                        </Flex>
                      ))}
                    </Flex>
                  </div>
                ) : (
                  <Flex align="center" justify="center" className="x-bg-gray">
                    <Text>{i18n.t('Waiting')}</Text>
                  </Flex>
                )}
              </div>
            </div>
          );
        })}
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
    <Box style={{ overflow: 'auto' }} mt="xs">
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
    </Box>
  );
}

// 7 | [0 - 6] | 6 - 7 + 1

export default memo(IndividualMatches);
