import React, { memo, useMemo, useState } from 'react';

import { Box, Flex, Pagination, Table, Text, Title } from '@mantine/core';
import cn from 'classnames';
import i18next from 'i18next';
import { useSelector } from 'react-redux';

import { currentUserClanIdSelector } from '@/selectors';

import LanguageIcon from '../../components/LanguageIcon';

export interface LeaderboardItem {
  userId: number;
  place?: number;
  clanId?: number;
  userName?: string;
  userLang?: string;
  user_lang?: string;
  lang?: string;
  clanLongName?: string;
  clanName?: string;
  score?: number;
  winsCount?: number;
  gamesCount?: number;
  avgResultPercent?: number | string;
  totalTime?: number | string;
  [key: string]: unknown;
}

interface FinishedLeaderboardProps {
  leaderboard: LeaderboardItem[];
}

const getCustomEventTrClassName = (item: LeaderboardItem, selectedId: number | undefined) =>
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

function FinishedLeaderboard({ leaderboard }: FinishedLeaderboardProps) {
  const currentUserClanId = useSelector(currentUserClanIdSelector);
  const pageSize = 16;
  const [pageNumber, setPageNumber] = useState(1);
  const totalEntries = leaderboard.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));
  const safePageNumber = Math.min(pageNumber, totalPages);
  const pagedLeaderboard = useMemo(
    () => leaderboard.slice((safePageNumber - 1) * pageSize, safePageNumber * pageSize),
    [leaderboard, pageSize, safePageNumber],
  );

  const handlePageChange = (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages || nextPage === safePageNumber) {
      return;
    }
    setPageNumber(nextPage);
  };

  return (
    <Box className="cb-bg-panel shadow-sm p-3 cb-rounded overflow-auto">
      <Box my="xs">
        <Flex direction="column" flex={1} pos="relative" py="xs" className="mh-100 rounded-left">
          <Flex
            justify="space-between"
            pb="xs"
            px="md"
            style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
          >
            <Text fw={700}>{i18next.t('Leaderboard')}</Text>
          </Flex>
          <div className="d-flex cb-overflow-x-auto">
            <Table striped className="cb-text-light cb-custom-event-table m-1">
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
                  <Table.Th className="p-1 pl-4 font-weight-light border-0">
                    {i18next.t('Wins')}
                  </Table.Th>
                  <Table.Th className="p-1 pl-4 font-weight-light border-0">
                    {i18next.t('Games')}
                  </Table.Th>
                  <Table.Th className="p-1 pl-4 font-weight-light border-0">
                    {i18next.t('Avg Result')}
                  </Table.Th>
                  <Table.Th className="p-1 pl-4 font-weight-light border-0">
                    {i18next.t('Total Time')}
                  </Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {pagedLeaderboard.map((item) => (
                  <React.Fragment key={item.userId}>
                    <Table.Tr className="cb-custom-event-empty-space-tr" aria-hidden="true" />
                    <Table.Tr
                      className={getCustomEventTrClassName(
                        item,
                        currentUserClanId as number | undefined,
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
                          title={item?.userName}
                          className="cb-custom-event-name"
                          style={{
                            textOverflow: 'ellipsis',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            maxWidth: '13ch',
                          }}
                        >
                          {(item?.userLang || item?.user_lang || item?.lang) && (
                            <LanguageIcon
                              className="mr-1"
                              lang={item?.userLang || item?.user_lang || item?.lang}
                            />
                          )}
                          <a href={`/users/${item.userId}`}>
                            {(item?.userName ?? '').slice(0, 9) +
                              ((item?.userName?.length ?? 0) > 11 ? '...' : '')}
                          </a>
                        </div>
                      </Table.Td>
                      <Table.Td title={item?.clanLongName} className={tableDataCellClassName}>
                        <div
                          className="cb-custom-event-name"
                          style={{
                            textOverflow: 'ellipsis',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            maxWidth: '13ch',
                          }}
                        >
                          {item.clanId ? (
                            <a href={`/clans/${item.clanId}`}>{item?.clanName}</a>
                          ) : (
                            item?.clanName
                          )}
                        </div>
                      </Table.Td>
                      <Table.Td className={tableDataCellClassName}>{item.score}</Table.Td>
                      <Table.Td className={tableDataCellClassName}>{item.winsCount}</Table.Td>
                      <Table.Td className={tableDataCellClassName}>{item.gamesCount}</Table.Td>
                      <Table.Td className={tableDataCellClassName}>
                        {parseFloat(item.avgResultPercent as string).toFixed(1)}%
                      </Table.Td>
                      <Table.Td
                        style={{
                          borderTopRightRadius: '0.5rem',
                          borderBottomRightRadius: '0.5rem',
                        }}
                        className={tableDataCellClassName}
                      >
                        {item.totalTime}
                      </Table.Td>
                    </Table.Tr>
                  </React.Fragment>
                ))}
              </Table.Tbody>
            </Table>
          </div>
        </Flex>
      </Box>
      <Flex align="center" wrap="wrap" justify="flex-start">
        <Title order={6} mb="xs" mr="xl">
          {`${i18next.t('Total players')}: ${totalEntries}`}
        </Title>
        {totalPages > 1 && (
          <Flex align="center" mb="xs">
            <Pagination
              value={safePageNumber}
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

export default memo(FinishedLeaderboard);
