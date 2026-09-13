import React, { memo } from 'react';

import { Box, Table, Text } from '@mantine/core';

import cn from 'classnames';
import i18next from 'i18next';
import { useSelector } from 'react-redux';

import { currentUserClanIdSelector, tournamentSelector } from '@/selectors';

interface ClanRankingItem {
  id: number;
  place?: number;
  name?: string;
  clan?: string;
  score?: number;
  [key: string]: unknown;
}

const getCustomEventTrClassName = (item: ClanRankingItem, selectedId: unknown) =>
  cn(
    'cb-custom-event-tr',
    {
      'cb-gold-place-bg': item?.place === 1,
      'cb-silver-place-bg': item?.place === 2,
      'cb-bronze-place-bg': item?.place === 3,
    },
    {
      'cb-custom-event-tr-brown-border': item.id === selectedId,
    },
  );

const tableDataCellClassName = cn('cb-custom-event-td');

function TournamentClanTable() {
  const currentUserClanId = useSelector(currentUserClanIdSelector);
  const { clans, ranking, rankingType } = useSelector(tournamentSelector) as unknown as {
    clans: Record<number, { name?: string; longName?: string } | undefined>;
    ranking: ClanRankingItem[] | { entries: ClanRankingItem[] } | undefined;
    rankingType?: string;
  };

  const items = Array.isArray(ranking) ? ranking : ranking?.entries;

  if (!items || items.length === 0) {
    return <></>;
  }

  return (
    <Box
      my={{ base: 8, lg: 0 }}
      mb={8}
      px={4}
      className="cb-overflow-x-auto"
      style={{ borderRadius: '0.5rem', position: 'relative' }}
    >
      <Table striped className="cb-custom-event-table">
        <Table.Thead>
          <Table.Tr>
            {rankingType !== 'byClan' && (
              <Table.Th c="dimmed" fw="normal" p="xs" pl={24}>
                {i18next.t('User')}
              </Table.Th>
            )}
            <Table.Th c="dimmed" fw="normal" p="xs" pl={24}>
              {i18next.t('Clan')}
            </Table.Th>
            <Table.Th c="dimmed" fw="normal" p="xs" pl={24}>
              {i18next.t('Score')}
            </Table.Th>
            <Table.Th c="dimmed" fw="normal" p="xs" pl={24}>
              {i18next.t('Place')}
            </Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {items?.map((item) => {
            const isPlaceRow = !!item?.place && item.place <= 3;

            return (
              <React.Fragment key={item.id}>
                <Table.Tr className="cb-custom-event-empty-space-tr" aria-hidden="true" />
                <Table.Tr
                  className={getCustomEventTrClassName(item, currentUserClanId)}
                  style={
                    isPlaceRow
                      ? {
                          fontWeight: 700,
                          color: 'var(--mantine-color-dark-8)',
                        }
                      : {
                          backgroundColor:
                            !item?.place || item.place > 3
                              ? 'var(--mantine-color-cbPanel-6)'
                              : undefined,
                        }
                  }
                >
                  {rankingType !== 'byClan' && (
                    <>
                      <Table.Td width={120} className={tableDataCellClassName}>
                        <div className="cb-custom-event-name" style={{ maxWidth: 120 }}>
                          {item.name}
                        </div>
                      </Table.Td>
                      <Table.Td title={item.clan} className={tableDataCellClassName}>
                        <div className="cb-custom-event-name" style={{ maxWidth: 120 }}>
                          {item.clan}
                        </div>
                      </Table.Td>
                    </>
                  )}
                  {rankingType === 'byClan' && (
                    <Table.Td title={clans[item.id]?.longName} className={tableDataCellClassName}>
                      <div className="cb-custom-event-name" style={{ maxWidth: 120 }}>
                        {clans[item.id]?.name}
                      </div>
                    </Table.Td>
                  )}
                  <Table.Td width={120} className={tableDataCellClassName}>
                    {item.score}
                  </Table.Td>
                  <Table.Td width={122} className={tableDataCellClassName}>
                    {item.place}
                  </Table.Td>
                </Table.Tr>
              </React.Fragment>
            );
          })}
        </Table.Tbody>
      </Table>
    </Box>
  );
}

export default memo(TournamentClanTable);
