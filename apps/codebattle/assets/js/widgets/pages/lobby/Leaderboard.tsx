import React, { useEffect, useMemo } from 'react';

import { Box, Flex, SegmentedControl, Table } from '@mantine/core';
import { useSelector, useDispatch } from 'react-redux';

import i18n from '../../../i18n';
import { type UserNameUser } from '../../components/UserName';
import UserInfo from '../../components/UserInfo';
import periodTypes from '../../config/periodTypes';
import { actions, type AppDispatch } from '../../slices';
import { leaderboardSelector } from '../../slices/leaderboard';

interface LeaderboardUser extends UserNameUser {
  rating?: number;
}

const periodOptions = [
  { value: periodTypes.WEEKLY, label: i18n.t(periodTypes.WEEKLY) },
  { value: periodTypes.MONTHLY, label: i18n.t(periodTypes.MONTHLY) },
  { value: periodTypes.ALL, label: i18n.t(periodTypes.ALL) },
];

function Leaderboard() {
  const dispatch = useDispatch<AppDispatch>();

  const { users, period } = useSelector(leaderboardSelector);

  const rating = useMemo(
    () => [...(users as LeaderboardUser[])].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)),
    [users],
  );

  useEffect(() => {
    (async () => {
      try {
        await dispatch(actions.fetchUsers({ periodType: period }));
      } catch (e) {
        throw new Error(e instanceof Error ? e.message : String(e));
      }
    })();
    /* eslint-disable-next-line */
  }, [period]);

  return (
    <Table
      striped
      m={0}
      className="cb-bg-panel cb-border-color"
      style={{ borderRadius: 'var(--mantine-radius-md)', boxShadow: 'var(--mantine-shadow-sm)' }}
    >
      <Table.Thead>
        <Table.Tr aria-label={i18n.t('Leaderboard header')}>
          <Table.Th
            scope="col"
            aria-label={i18n.t('Leaderboard')}
            tt="uppercase"
            py={4}
            px={0}
            colSpan={2}
          >
            <Flex direction="column" align="center" wrap="nowrap">
              <Flex align="center">
                <img
                  alt={i18n.t('Rating')}
                  src="/assets/images/topPlayers.svg"
                  style={{ margin: '0.5rem' }}
                />
                <span>{i18n.t('Leaderboard')}</span>
              </Flex>
              <Box w="100%" mt="xs">
                <SegmentedControl
                  fullWidth
                  size="xs"
                  value={period}
                  onChange={(value) => dispatch(actions.changePeriod(value))}
                  data={periodOptions}
                />
              </Box>
            </Flex>
          </Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {rating && rating.length > 0 ? (
          rating.map((item) => (
            <Table.Tr key={item.name}>
              <Table.Td pr={0}>
                <Flex>
                  <UserInfo user={item} truncate />
                </Flex>
              </Table.Td>
              <Table.Td ta="right" pl={0}>
                {item.rating}
              </Table.Td>
            </Table.Tr>
          ))
        ) : (
          <Table.Tr>
            <Table.Td ta="center">{i18n.t('No rating')}</Table.Td>
          </Table.Tr>
        )}
      </Table.Tbody>
    </Table>
  );
}

export default Leaderboard;
