import React, { useMemo } from 'react';

import { Box, Table } from '@mantine/core';
import isEmpty from 'lodash/isEmpty';
import orderBy from 'lodash/orderBy';
import moment from 'moment';

import i18n from '../../../i18n';
import HorizontalScrollControls from '../../components/SideScrollControls';

import ShowButton from './ShowButton';
import TournamentCard, { type LobbyTournament } from './TournamentCard';

interface CompletedTournamentsProps {
  tournaments?: LobbyTournament[];
}

function CompletedTournaments({ tournaments = [] }: CompletedTournamentsProps) {
  const sortedTournaments = useMemo(() => orderBy(tournaments, 'startsAt', 'desc'), [tournaments]);

  if (isEmpty(tournaments)) {
    return null;
  }

  return (
    <Box style={{ overflowX: 'auto' }}>
      <Box component="h2" ta="center" mt="md">
        {i18n.t('Completed tournaments')}
      </Box>
      <Box
        display={{ base: 'none', md: 'block' }}
        style={{
          overflowX: 'auto',
          borderBottomLeftRadius: 'var(--mantine-radius-md)',
          borderBottomRightRadius: 'var(--mantine-radius-md)',
        }}
      >
        <Table
          striped
          verticalSpacing="md"
          horizontalSpacing="md"
          styles={{ td: { verticalAlign: 'middle' } }}
        >
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{i18n.t('Title')}</Table.Th>
              <Table.Th>{i18n.t('Type')}</Table.Th>
              <Table.Th>{i18n.t('Starts at')}</Table.Th>
              <Table.Th>{i18n.t('Actions')}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {sortedTournaments.map((tournament) => (
              <Table.Tr key={tournament.id}>
                <Table.Td>{tournament.name}</Table.Td>
                <Table.Td>{tournament.type}</Table.Td>
                <Table.Td style={{ whiteSpace: 'nowrap' }}>
                  {moment.utc(tournament.startsAt).local().format('YYYY-MM-DD HH:mm')}
                </Table.Td>
                <Table.Td>
                  <ShowButton url={`/tournaments/${tournament.id}/`} />
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Box>
      <Box hiddenFrom="md" m="sm">
        <HorizontalScrollControls>
          {sortedTournaments.map((tournament) => (
            <TournamentCard
              key={`card-${tournament.id}`}
              type="completed"
              tournament={tournament}
            />
          ))}
        </HorizontalScrollControls>
      </Box>
    </Box>
  );
}

export default CompletedTournaments;
