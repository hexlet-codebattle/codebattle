import React from 'react';

import { Flex, Group, Table, Text } from '@mantine/core';
import i18next from 'i18next';
import { useSelector } from 'react-redux';

import { currentUserClanIdSelector, tournamentSelector, gameStatusSelector } from '@/selectors';

import LanguageIcon from '../../components/LanguageIcon';
import GameStateCodes from '../../config/gameStateCodes';
import TournamentStates from '../../config/tournament';
import { TournamentRemainingTimer } from '../tournament/TournamentHeader';

interface RankingEntry {
  id: number;
  place?: number;
  clanId?: number;
  name?: string;
  clan?: string;
  score?: number;
  lang?: string;
  userLang?: string;
  user_lang?: string;
}

const getCustomEventTrClassName = (item: RankingEntry, selectedId: number | null) => {
  const classes = ['cb-custom-event-tr-border'];

  if (item?.place === 1) classes.push('cb-gold-place-bg');
  else if (item?.place === 2) classes.push('cb-silver-place-bg');
  else if (item?.place === 3) classes.push('cb-bronze-place-bg');

  if (item?.clanId === selectedId) classes.push('cb-custom-event-tr-brown-border');

  return classes.join(' ');
};

function TournamentRankingTable() {
  const currentUserClanId = useSelector(currentUserClanIdSelector);
  const gameStatus = useSelector(gameStatusSelector);
  const {
    breakDurationSeconds,
    breakState,
    currentRoundTimeoutSeconds,
    currentRoundPosition,
    lastRoundEndedAt,
    lastRoundStartedAt,
    ranking,
    roundsLimit,
    state,
    taskIds,
  } = useSelector(tournamentSelector) as unknown as {
    breakDurationSeconds?: number;
    breakState?: string;
    currentRoundTimeoutSeconds?: number;
    currentRoundPosition: number;
    lastRoundEndedAt?: string;
    lastRoundStartedAt?: string;
    ranking?: { entries?: RankingEntry[] };
    roundsLimit?: number;
    state?: string;
    taskIds?: unknown[];
  };
  const totalRounds = roundsLimit || taskIds?.length || 0;
  const isLastRound = totalRounds > 0 && currentRoundPosition + 1 >= totalRounds;
  const isTournamentFinished = state === TournamentStates.finished;

  return (
    <Flex
      direction="column"
      flex="1 1 0"
      pos="relative"
      py="sm"
      className="cb-game-chat-container cb-messages-container"
      style={{
        minHeight: 0,
        borderTopLeftRadius: 'var(--mantine-radius-md)',
        borderBottomLeftRadius: 'var(--mantine-radius-md)',
      }}
    >
      <Group
        justify="space-between"
        style={{
          borderBottom: '1px solid var(--mantine-color-default-border)',
        }}
        pb="sm"
        px="md"
      >
        <Text fw={700}>{i18next.t('Ranking')}</Text>
      </Group>

      <Table.ScrollContainer minWidth={200}>
        <Table
          striped
          className="cb-custom-event-table cb-game-ranking-table"
          c="cbText"
          m="xs"
          styles={{
            td: {
              padding: '0.25rem 0 0.25rem 1rem',
              verticalAlign: 'middle',
              whiteSpace: 'nowrap',
              position: 'relative',
            },
            th: {
              padding: '0.25rem 0 0.25rem 1rem',
              fontWeight: 300,
            },
          }}
        >
          <colgroup>
            <col style={{ width: '12%' }} />
            <col style={{ width: '44%' }} />
            <col style={{ width: '28%' }} />
            <col style={{ width: '16%' }} />
          </colgroup>
          <Table.Thead c="cbText">
            <Table.Tr>
              <Table.Th>{i18next.t('Place')}</Table.Th>
              <Table.Th>{i18next.t('Player')}</Table.Th>
              <Table.Th>{i18next.t('Clan')}</Table.Th>
              <Table.Th>{i18next.t('Score')}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {ranking?.entries?.slice(0, 7)?.map((item) => (
              <React.Fragment key={item.id}>
                <Table.Tr className="cb-custom-event-empty-space-tr" aria-hidden="true" />
                <Table.Tr
                  fw={700}
                  className={getCustomEventTrClassName(
                    item,
                    (currentUserClanId as number | null) ?? null,
                  )}
                >
                  <Table.Td
                    className="cb-custom-event-td"
                    style={{
                      borderTopLeftRadius: '0.5rem',
                      borderBottomLeftRadius: '0.5rem',
                    }}
                  >
                    {item.place}
                  </Table.Td>
                  <Table.Td className="cb-custom-event-td">
                    <div
                      title={item?.name}
                      className="cb-custom-event-name"
                      style={{
                        textOverflow: 'ellipsis',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        maxWidth: '16ch',
                      }}
                    >
                      {(item?.lang || item?.userLang || item?.user_lang) && (
                        <LanguageIcon
                          style={{ marginRight: '0.25rem' }}
                          lang={item?.lang || item?.userLang || item?.user_lang}
                        />
                      )}
                      {(item?.name ?? '').slice(0, 12) +
                        ((item?.name?.length ?? 0) > 14 ? '...' : '')}
                    </div>
                  </Table.Td>
                  <Table.Td className="cb-custom-event-td">
                    <div
                      title={item?.clan}
                      className="cb-custom-event-name"
                      style={{
                        textOverflow: 'ellipsis',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        maxWidth: '14ch',
                      }}
                    >
                      {(item?.clan ?? '').slice(0, 12) +
                        ((item?.clan?.length ?? 0) > 14 ? '...' : '')}
                    </div>
                  </Table.Td>
                  <Table.Td
                    className="cb-custom-event-td"
                    style={{
                      borderTopRightRadius: '0.5rem',
                      borderBottomRightRadius: '0.5rem',
                    }}
                  >
                    {item.score}
                  </Table.Td>
                </Table.Tr>
              </React.Fragment>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>

      <Group justify="space-around" align="center" mt="xs">
        {currentRoundPosition + 1 !== totalRounds &&
          gameStatus.state !== GameStateCodes.playing &&
          Number.isInteger(currentRoundTimeoutSeconds) &&
          breakState === 'off' && (
            <Text fw={700} mr="md" c="cbText">
              {i18next.t('Round ends in ')}
              <TournamentRemainingTimer
                key={lastRoundStartedAt}
                startsAt={lastRoundStartedAt}
                duration={currentRoundTimeoutSeconds}
              />
            </Text>
          )}

        {gameStatus.state !== GameStateCodes.playing &&
          breakState === 'on' &&
          !isTournamentFinished &&
          !isLastRound &&
          (lastRoundEndedAt && Number.isInteger(breakDurationSeconds) ? (
            <Text fw={700} mr="md" c="cbText">
              {i18next.t('Next round will start in ')}
              <TournamentRemainingTimer
                key={lastRoundEndedAt}
                startsAt={lastRoundEndedAt}
                duration={breakDurationSeconds}
              />
            </Text>
          ) : (
            <Text fw={700} mr="md" c="cbText">
              {i18next.t('Next round will start soon')}
            </Text>
          ))}
      </Group>

      <Group justify="space-around" align="center" mt="xs">
        {totalRounds > 0 && (
          <Text fw={700} c="cbText">
            {i18next.t('Round')}
            {': '}
            {currentRoundPosition + 1}/{totalRounds}
          </Text>
        )}
      </Group>
    </Flex>
  );
}

export default TournamentRankingTable;
