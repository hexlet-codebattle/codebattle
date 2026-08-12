import React from 'react';
import cn from 'classnames';
import { Badge, Box, Flex, Table, Text } from '@mantine/core';
import i18n from '../../../i18n';
import LeaderboardSlicePlayerRow from './LeaderboardSlicePlayerRow';
import { type SlicePlayer } from './types';

interface LeaderboardSliceItemProps {
  sliceIndex: number;
  players: SlicePlayer[];
  hasCurrentUser: boolean;
  currentUserId?: number;
}

const LeaderboardSliceItem = ({
  sliceIndex,
  players,
  hasCurrentUser,
  currentUserId,
}: LeaderboardSliceItemProps) => (
  <Box
    bg="cbPanel"
    p="sm"
    style={{
      minWidth: '20rem',
      flex: '1 1 22rem',
      borderRadius: 'var(--mantine-radius-md)',
      ...(hasCurrentUser ? { border: '1px solid #ffc107' } : {}),
    }}
  >
    <Flex
      justify="space-between"
      px="sm"
      pb="xs"
      mb="sm"
      style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}
    >
      <Text fw={700}>
        {`${i18n.t('Slice')} ${sliceIndex + 1}`}
        {hasCurrentUser && (
          <Badge color="yellow" c="black" ml="xs">
            {i18n.t('You')}
          </Badge>
        )}
      </Text>
      <Text c="dimmed" size="sm">
        {i18n.t('%{count} players', { count: players.length })}
      </Text>
    </Flex>
    <Table verticalSpacing="xs" c="cbTextLight" mb={0}>
      <Table.Thead>
        <Table.Tr>
          <Table.Th p="xs" fw={300}>
            #
          </Table.Th>
          <Table.Th p="xs" fw={300}>
            {i18n.t('Player')}
          </Table.Th>
          <Table.Th p="xs" fw={300}>
            {i18n.t('Clan')}
          </Table.Th>
          <Table.Th p="xs" fw={300} ta="right">
            {i18n.t('Score')}
          </Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {players.map((p, idx) => (
          <LeaderboardSlicePlayerRow
            key={p.userId}
            player={p}
            index={idx}
            currentUserId={currentUserId}
          />
        ))}
      </Table.Tbody>
    </Table>
  </Box>
);

export default LeaderboardSliceItem;
