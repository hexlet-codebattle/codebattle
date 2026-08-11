import React, { memo, useState, useCallback } from 'react';

import { Box, Table, Text } from '@mantine/core';

import cn from 'classnames';
import i18next from 'i18next';
import { useDispatch } from 'react-redux';

import { type AppDispatch } from '@/slices';

import UserInfo from '../../components/UserInfo';
import { getResults } from '../../middlewares/Tournament';

import TournamentContextMenu, { useTournamentContextMenu } from './TournamentContextMenu';
import useTournamentPanel from './useTournamentPanel';

const getCustomEventTrClassName = (type: string, muted: boolean) =>
  cn('cb-custom-event-tr', {
    'cb-custom-event-bg-success': type === 'clan' && !muted,
    'cb-custom-event-bg-muted-success': type === 'clan' && muted,
    'cb-custom-event-bg-purple cursor-pointer': type === 'user' && !muted,
    'cb-custom-event-bg-muted-purple cursor-pointer': type === 'user' && muted,
  });

const tableDataCellClassName = (hideSeparator?: boolean) =>
  cn('cb-custom-event-td', {
    'hide-separator': hideSeparator,
  });

interface ClanUser {
  userId: number;
  userName: string;
  clanId: number;
  clanRank: number;
  clanName?: string;
  clanLongName?: string;
  totalScore: number;
  winsCount: number;
  totalDurationSec: number;
}

interface RatingClansPanelProps {
  type: string;
  state: string;
  handleUserSelectClick: (event: React.MouseEvent | React.KeyboardEvent) => void;
}

function RatingClansPanel({ type, state, handleUserSelectClick }: RatingClansPanelProps) {
  const dispatch = useDispatch<AppDispatch>();

  const [items, setItems] = useState<ClanUser[][]>([]);

  const fetchData = useCallback(
    () => dispatch(getResults(type, {}, setItems)),
    [setItems, dispatch, type],
  );

  useTournamentPanel(fetchData, state);

  const { menuId, menuRequest } = useTournamentContextMenu({
    type: 'user',
  });

  return (
    <TournamentContextMenu menuId={menuId} request={menuRequest}>
      <Box
        my={{ base: 8, lg: 0 }}
        mb={8}
        px={4}
        className="cb-overflow-x-auto cb-overflow-y-auto"
        style={{ borderRadius: '0.5rem', position: 'relative' }}
      >
        <Table striped className="cb-custom-event-table">
          <Table.Thead>
            <Table.Tr>
              <Table.Th c="dimmed" fw="normal" p="xs" pl={24} />
              <Table.Th c="dimmed" fw="normal" p="xs" pl={24}>
                {i18next.t('Clan')}
              </Table.Th>
              <Table.Th c="dimmed" fw="normal" p="xs" pl={24}>
                {i18next.t('Score')}
              </Table.Th>
              <Table.Th c="dimmed" fw="normal" p="xs" pl={24}>
                {i18next.t('Wins count')}
              </Table.Th>
              <Table.Th c="dimmed" fw="normal" p="xs" pl={24}>
                {i18next.t('Total time for solving task')}
              </Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {items?.map((users, index) => (
              <React.Fragment key={`${type}-clan-${users[0].clanId}`}>
                <Table.Tr className="cb-custom-event-empty-space-tr" aria-hidden="true" />
                <Table.Tr className={getCustomEventTrClassName('clan', index > 3)}>
                  <Table.Td className={tableDataCellClassName(true)}>{users[0].clanRank}</Table.Td>
                  <Table.Td title={users[0].clanLongName} className={tableDataCellClassName()}>
                    <div className="cb-custom-event-name">{users[0].clanName}</div>
                  </Table.Td>
                  <Table.Td className={tableDataCellClassName()}>
                    {users.reduce((acc, user) => acc + user.totalScore, 0) || 0}
                  </Table.Td>
                  <Table.Td className={tableDataCellClassName()}>
                    {users.reduce((acc, user) => acc + user.winsCount, 0) || 0}
                  </Table.Td>
                  <Table.Td className={tableDataCellClassName()}>
                    {users.reduce((acc, user) => acc + user.totalDurationSec, 0) || 0}
                  </Table.Td>
                </Table.Tr>
                {users.map((user) => (
                  <React.Fragment key={`${type}-user-${user.userId}`}>
                    <Table.Tr className="cb-custom-event-empty-space-tr" aria-hidden="true">
                      <Table.Td />
                    </Table.Tr>
                    <Table.Tr className={getCustomEventTrClassName('user', index > 3)}>
                      <Table.Td
                        className={tableDataCellClassName(true)}
                        aria-label={i18next.t('User row')}
                      />
                      <Table.Td className={tableDataCellClassName()}>
                        <div
                          role="button"
                          tabIndex={0}
                          className="cb-custom-event-name cursor-pointer"
                          // onContextMenu={displayMenu}
                          onClick={handleUserSelectClick}
                          onKeyPress={handleUserSelectClick}
                          data-user-id={user.userId}
                          data-user-name={user.userName}
                        >
                          {/* UserInfo currently types className/displayName/lang as required;
                              they are optional at runtime, so omit them here. */}
                          <UserInfo
                            user={{ id: user.userId, name: user.userName }}
                            hideOnlineIndicator
                            hideLink
                            linkClassName="text-secondary"
                            className={undefined}
                            displayName={undefined}
                            lang={undefined}
                          />
                        </div>
                      </Table.Td>
                      <Table.Td className={tableDataCellClassName()}>
                        {user.totalScore || 0}
                      </Table.Td>
                      <Table.Td className={tableDataCellClassName()}>
                        {user.winsCount || 0}
                      </Table.Td>
                      <Table.Td className={tableDataCellClassName()}>
                        {user.totalDurationSec || 0}
                      </Table.Td>
                    </Table.Tr>
                  </React.Fragment>
                ))}
              </React.Fragment>
            ))}
          </Table.Tbody>
        </Table>
      </Box>
    </TournamentContextMenu>
  );
}

export default memo(RatingClansPanel);
