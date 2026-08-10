import React from 'react';
import { Flex, Table } from '@mantine/core';
import i18n from '../../../i18n';
import LeaderboardRatingTableRow from './LeaderboardRatingTableRow';
import { tdCellProps } from '../../utils/groupTournament';
import { type LeaderboardEntry } from './types';

interface LeaderboardRatingTableProps {
  leaderboard: LeaderboardEntry[];
  rounds: number[];
  currentUserId?: number;
}

const LeaderboardRatingTable = ({
  leaderboard,
  rounds,
  currentUserId,
}: LeaderboardRatingTableProps) => (
  <Flex className="cb-overflow-x-auto">
    <Table className="cb-text-light cb-custom-event-table" striped verticalSpacing="xs" m="xs">
      <Table.Thead>
        <Table.Tr>
          <Table.Th {...tdCellProps} scope="col" fw={300}>
            #
          </Table.Th>
          <Table.Th {...tdCellProps} scope="col" fw={300}>
            {i18n.t('Player')}
          </Table.Th>
          <Table.Th {...tdCellProps} scope="col" fw={300}>
            {i18n.t('Clan')}
          </Table.Th>
          <Table.Th {...tdCellProps} scope="col" fw={300} ta="center">
            {i18n.t('Slice')}
          </Table.Th>
          {rounds.map((r) => (
            <Table.Th key={`r-${r}`} {...tdCellProps} scope="col" fw={300} ta="center">
              {r === 1 ? i18n.t('Seed') : i18n.t('Round %{n}', { n: r - 1 })}
            </Table.Th>
          ))}
          <Table.Th {...tdCellProps} scope="col" fw={300} ta="center">
            {i18n.t('Total')}
          </Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {leaderboard.map((entry, index) => (
          <LeaderboardRatingTableRow
            key={entry.userId}
            entry={entry}
            index={index}
            rounds={rounds}
            currentUserId={currentUserId}
          />
        ))}
      </Table.Tbody>
    </Table>
  </Flex>
);

export default LeaderboardRatingTable;
