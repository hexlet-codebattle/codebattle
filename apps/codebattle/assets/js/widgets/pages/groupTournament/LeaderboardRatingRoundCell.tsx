import React from 'react';
import { Table, Text } from '@mantine/core';
import { tdCellProps } from '../../utils/groupTournament';
import { type RoundCell } from './types';

interface LeaderboardRatingRoundCellProps {
  cell?: RoundCell | null;
}

const LeaderboardRatingRoundCell = ({ cell }: LeaderboardRatingRoundCellProps) => {
  if (!cell) {
    return (
      <Table.Td {...tdCellProps} ta="center" c="dimmed">
        —
      </Table.Td>
    );
  }

  const sliceLabel = Number.isInteger(cell.sliceIndex) ? `S${(cell.sliceIndex as number) + 1}` : '';
  const placeLabel = Number.isInteger(cell.place) ? `#${cell.place}` : '';
  const meta = [sliceLabel, placeLabel].filter(Boolean).join('·');

  return (
    <Table.Td {...tdCellProps} ta="center" title={meta.replaceAll('·', ' · ')}>
      <Text span fw={700}>
        {cell.score ?? 0}
      </Text>
      {meta && (
        <Text span size="sm" ml="xs">
          {`(${meta})`}
        </Text>
      )}
    </Table.Td>
  );
};

export default LeaderboardRatingRoundCell;
