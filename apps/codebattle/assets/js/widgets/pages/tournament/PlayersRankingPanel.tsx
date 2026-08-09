import React, { memo, useEffect, useMemo, useRef, useState } from 'react';

import { ActionIcon, Box, Button, Flex, Pagination, Table, Text, Title } from '@mantine/core';
import cn from 'classnames';
import i18next from 'i18next';
import { useDispatch, useSelector } from 'react-redux';

import { currentUserClanIdSelector, currentUserIdSelector } from '@/selectors';

import { type AppDispatch } from '@/slices';

import LanguageIcon from '../../components/LanguageIcon';
import { requestNearestRankingPage, requestRankingPage } from '../../middlewares/Tournament';
import { kickTournamentPlayer } from '../../middlewares/TournamentAdmin';

interface RankingItem {
  id: number;
  place?: number;
  clanId?: number;
  name?: string;
  clan?: string;
  lang?: string;
  score?: number;
  [key: string]: unknown;
}

interface Ranking {
  entries?: RankingItem[];
  pageNumber?: number;
  pageSize?: number;
  totalEntries?: number;
}

const getCustomEventTrClassName = (item: RankingItem, selectedId: number | null) =>
  cn(
    'fw-bold cb-custom-event-tr-border',
    {
      'cb-gold-place-bg': item?.place === 1,
      'cb-silver-place-bg': item?.place === 2,
      'cb-bronze-place-bg': item?.place === 3,
      'cb-bg-panel': !item?.place || item?.place > 3,
    },
    {
      'cb-custom-event-tr-brown-border': item?.clanId === selectedId,
    },
  );

const tableDataCellClassName = cn(
  'p-1 pl-4 my-2 align-middle text-nowrap pos-relative cb-custom-event-td border-0',
);

interface PlayersRankingPanelProps {
  canModerate?: boolean;
  playersCount: number;
  ranking?: Ranking;
}

function PlayersRankingPanel({
  canModerate = false,
  playersCount,
  ranking,
}: PlayersRankingPanelProps) {
  const dispatch = useDispatch<AppDispatch>();
  const currentUserClanId = useSelector(currentUserClanIdSelector);
  const currentUserId = useSelector(currentUserIdSelector);
  const requestedNearestPage = useRef(false);
  const manualPageChange = useRef(false);

  const rankingItems = useMemo(() => ranking?.entries || [], [ranking?.entries]);
  const pageNumber = ranking?.pageNumber || 1;
  const totalEntries = ranking?.totalEntries || 0;
  const displayPageSize = 16;
  const [localPageNumber, setLocalPageNumber] = useState(1);

  const isServerPaged =
    totalEntries > 0 || playersCount > displayPageSize || rankingItems.length > displayPageSize;
  const effectivePageNumber = isServerPaged ? pageNumber : localPageNumber;
  const effectivePageSize = displayPageSize;
  const fallbackTotalEntries = playersCount || rankingItems.length;
  const effectiveTotalEntries =
    isServerPaged && totalEntries > 0 ? totalEntries : fallbackTotalEntries;
  const pagedRankingItems = isServerPaged
    ? rankingItems.slice(0, displayPageSize)
    : rankingItems.slice(
        (effectivePageNumber - 1) * displayPageSize,
        effectivePageNumber * displayPageSize,
      );

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(effectiveTotalEntries / effectivePageSize)),
    [effectivePageSize, effectiveTotalEntries],
  );

  useEffect(() => {
    if (!isServerPaged && effectivePageNumber > totalPages) {
      setLocalPageNumber(1);
    }
  }, [effectivePageNumber, isServerPaged, totalPages]);

  useEffect(() => {
    if (manualPageChange.current) {
      return;
    }

    if (rankingItems.length === 0 && playersCount > 0) {
      dispatch(requestRankingPage(1, effectivePageSize));
    }
  }, [dispatch, effectivePageSize, playersCount, rankingItems.length]);

  useEffect(() => {
    if (!currentUserId || requestedNearestPage.current || manualPageChange.current) {
      return;
    }

    const hasUserInList =
      rankingItems.length > 0 && rankingItems.some(({ id }) => id === currentUserId);
    const pageSizeMismatch = ranking?.pageSize && Number(ranking.pageSize) !== displayPageSize;

    if (pageSizeMismatch || (rankingItems.length > 0 && !hasUserInList)) {
      requestedNearestPage.current = true;
      dispatch(requestNearestRankingPage(currentUserId, effectivePageSize));
    }
  }, [
    currentUserId,
    dispatch,
    ranking,
    rankingItems,
    effectivePageSize,
    displayPageSize,
    manualPageChange,
  ]);

  const handlePageChange = (nextPage: number) => {
    if (nextPage === effectivePageNumber || nextPage < 1 || nextPage > totalPages) {
      return;
    }
    manualPageChange.current = true;
    if (isServerPaged) {
      dispatch(requestRankingPage(nextPage, effectivePageSize));
    } else {
      setLocalPageNumber(nextPage);
    }
  };

  const handleKickPlayer = (player: RankingItem) => {
    if (!window.confirm(i18next.t('Kick %{name} from tournament?', { name: player.name }))) {
      return;
    }

    kickTournamentPlayer(player.id, () => {
      dispatch(requestRankingPage(effectivePageNumber, effectivePageSize));
    });
  };

  return (
    <Box className="cb-bg-panel shadow-sm p-3 cb-rounded overflow-auto">
      <Box my="xs">
        {playersCount === 0 ? (
          <Text c="dimmed">{i18next.t('No players yet')}.</Text>
        ) : (
          <Flex direction="column" flex={1} pos="relative" py="xs" className="mh-100 rounded-left">
            <Flex
              justify="space-between"
              pb="xs"
              px="md"
              style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
            >
              <Text fw={700}>{i18next.t('Ranking')}</Text>
              <Text size="xs" c="dimmed">
                {i18next.t('Page')} {effectivePageNumber} {i18next.t('of')} {totalPages}
              </Text>
            </Flex>
            <div className="d-flex cb-overflow-x-auto">
              <Table className="cb-text-light cb-custom-event-table m-1" striped>
                <colgroup>
                  <col style={{ width: '12%' }} />
                  <col style={{ width: canModerate ? '36%' : '40%' }} />
                  <col style={{ width: canModerate ? '26%' : '30%' }} />
                  <col style={{ width: canModerate ? '14%' : '18%' }} />
                  <col style={{ width: canModerate ? '12%' : '0%' }} />
                </colgroup>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th className="p-1 pl-4 font-weight-light border-0">
                      {i18next.t('Place')}
                    </Table.Th>
                    <Table.Th className="p-1 pl-4 font-weight-light border-0">
                      {i18next.t('Player')}
                    </Table.Th>
                    <Table.Th className="p-1 pl-4 font-weight-light border-0">
                      {i18next.t('Clan')}
                    </Table.Th>
                    <Table.Th className="p-1 pl-4 font-weight-light border-0">
                      {i18next.t('Score')}
                    </Table.Th>
                    <Table.Th
                      className="p-1 pl-4 font-weight-light border-0"
                      aria-label={i18next.t('Actions')}
                    />
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {pagedRankingItems.map((item) => (
                    <React.Fragment key={item.id}>
                      <Table.Tr className="cb-custom-event-empty-space-tr" aria-hidden="true" />
                      <Table.Tr
                        className={getCustomEventTrClassName(
                          item,
                          currentUserClanId as number | null,
                        )}
                      >
                        <Table.Td
                          style={{
                            borderTopLeftRadius: '0.5rem',
                            borderBottomLeftRadius: '0.5rem',
                          }}
                          className={tableDataCellClassName}
                        >
                          {item.place}
                        </Table.Td>
                        <Table.Td className={tableDataCellClassName}>
                          <div
                            title={item?.name}
                            className="cb-custom-event-name"
                            style={{
                              textOverflow: 'ellipsis',
                              overflow: 'hidden',
                              whiteSpace: 'nowrap',
                              maxWidth: '20ch',
                            }}
                          >
                            {item?.lang && <LanguageIcon className="mr-1" lang={item.lang} />}
                            <a href={`/users/${item.id}`}>
                              {(item?.name ?? '').slice(0, 10) +
                                ((item?.name?.length ?? 0) > 10 ? '..' : '')}
                            </a>
                          </div>
                        </Table.Td>
                        <Table.Td className={tableDataCellClassName}>
                          <div
                            title={item?.clan}
                            className="cb-custom-event-name"
                            style={{
                              textOverflow: 'ellipsis',
                              overflow: 'hidden',
                              whiteSpace: 'nowrap',
                              maxWidth: '20ch',
                            }}
                          >
                            {item.clanId ? (
                              <a href={`/clans/${item.clanId}`}>
                                {(item?.clan ?? '').slice(0, 10) +
                                  ((item?.clan?.length ?? 0) > 10 ? '...' : '')}
                              </a>
                            ) : (
                              (item?.clan ?? '').slice(0, 10) +
                              ((item?.clan?.length ?? 0) > 10 ? '...' : '')
                            )}
                          </div>
                        </Table.Td>
                        <Table.Td className={tableDataCellClassName}>{item.score}</Table.Td>
                        <Table.Td
                          style={{
                            borderTopRightRadius: '0.5rem',
                            borderBottomRightRadius: '0.5rem',
                          }}
                          className={tableDataCellClassName}
                          aria-label={canModerate ? i18next.t('Actions') : i18next.t('Row spacer')}
                        >
                          {canModerate && (
                            <Button
                              size="compact-xs"
                              variant="outline"
                              color="red"
                              title={i18next.t('Kick player')}
                              aria-label={i18next.t('Kick player')}
                              onClick={() => handleKickPlayer(item)}
                            >
                              ×
                            </Button>
                          )}
                        </Table.Td>
                      </Table.Tr>
                    </React.Fragment>
                  ))}
                </Table.Tbody>
              </Table>
            </div>
          </Flex>
        )}
      </Box>
      <Flex align="center" wrap="wrap" justify="flex-start">
        <Title order={6} mb="xs" mr="xl">
          {`${i18next.t('Total players')}: ${playersCount}`}
        </Title>
        {playersCount > 0 && (
          <Flex align="center" mb="xs">
            <Pagination
              value={effectivePageNumber}
              total={totalPages}
              onChange={handlePageChange}
              withEdges
            />
          </Flex>
        )}
      </Flex>
    </Box>
  );
}

export default memo(PlayersRankingPanel);
