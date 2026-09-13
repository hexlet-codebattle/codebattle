import React from 'react';
import cn from 'classnames';
import { Badge, Box, Table, Text } from '@mantine/core';
import i18n from '../../../i18n';
import { trClassName, tdCellProps } from '../../utils/groupTournament';
import LeaderboardRatingRoundCell from './LeaderboardRatingRoundCell';
import { type LeaderboardEntry } from './types';

interface LeaderboardRatingTableRowProps {
  entry: LeaderboardEntry;
  index: number;
  rounds: number[];
  currentUserId?: number;
}

const cellProps = {
  ...tdCellProps,
  style: {
    ...tdCellProps.style,
    borderTopLeftRadius: '0.5rem',
    borderBottomLeftRadius: '0.5rem',
  },
};

const LeaderboardRatingTableRow = ({
  entry,
  index,
  rounds,
  currentUserId,
}: LeaderboardRatingTableRowProps) => {
  const place = index + 1;
  const isLeft = entry.state === 'left';
  const isMe = Number.isInteger(currentUserId) && entry.userId === currentUserId;

  return (
    <React.Fragment>
      <Table.Tr className="cb-custom-event-empty-space-tr" aria-hidden="true" />
      <Table.Tr
        className={cn(trClassName(place))}
        c={isLeft ? 'dimmed' : undefined}
        style={isMe ? { outline: '2px solid #ffc107' } : undefined}
      >
        <Table.Td {...cellProps}>{place}</Table.Td>
        <Table.Td {...tdCellProps}>
          <Box
            title={entry.name || `#${entry.userId}`}
            className="cb-custom-event-name"
            style={{
              textOverflow: 'ellipsis',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              maxWidth: '16ch',
            }}
          >
            {entry.name || `#${entry.userId}`}
          </Box>
          {isLeft && (
            <Badge color="gray" ml="sm">
              {i18n.t('Left')}
            </Badge>
          )}
        </Table.Td>
        <Table.Td {...tdCellProps}>
          <Box
            title={entry.clan || ''}
            style={{
              textOverflow: 'ellipsis',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              maxWidth: '16ch',
            }}
          >
            {entry.clan || '—'}
          </Box>
        </Table.Td>
        <Table.Td {...tdCellProps} ta="center">
          {Number.isInteger(entry.sliceIndex) ? (entry.sliceIndex as number) + 1 : '—'}
        </Table.Td>
        {rounds.map((r) => (
          <LeaderboardRatingRoundCell
            key={`c-${entry.userId}-${r}`}
            cell={entry.rounds && entry.rounds[r]}
          />
        ))}
        <Table.Td
          {...tdCellProps}
          ta="center"
          fw={700}
          style={{
            ...tdCellProps.style,
            borderTopRightRadius: '0.5rem',
            borderBottomRightRadius: '0.5rem',
          }}
        >
          {entry.totalScore ?? 0}
        </Table.Td>
      </Table.Tr>
    </React.Fragment>
  );
};

export default LeaderboardRatingTableRow;
