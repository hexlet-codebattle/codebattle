import React from 'react';
import cn from 'classnames';
import { Table } from '@mantine/core';
import { trClassName, truncate } from '../../utils/groupTournament';
import { type SlicePlayer } from './types';

interface LeaderboardSlicePlayerRowProps {
  player: SlicePlayer;
  index: number;
  currentUserId?: number;
}

const cellProps = {
  p: 'xs',
  style: {
    verticalAlign: 'middle' as const,
  },
};

const LeaderboardSlicePlayerRow = ({
  player,
  index,
  currentUserId,
}: LeaderboardSlicePlayerRowProps) => {
  const isMe = Number.isInteger(currentUserId) && player.userId === currentUserId;
  return (
    <Table.Tr
      className={cn(trClassName(player.place as number))}
      fw={700}
      style={isMe ? { outline: '2px solid #ffc107' } : undefined}
    >
      <Table.Td {...cellProps}>{player.place ?? index + 1}</Table.Td>
      <Table.Td {...cellProps} title={player.name}>
        {truncate(player.name) as React.ReactNode}
      </Table.Td>
      <Table.Td {...cellProps} c="white" title={player.clan || ''}>
        {player.clan ? (truncate(player.clan) as React.ReactNode) : '—'}
      </Table.Td>
      <Table.Td {...cellProps} ta="right" fw={700}>
        {player.score}
      </Table.Td>
    </Table.Tr>
  );
};

export default LeaderboardSlicePlayerRow;
