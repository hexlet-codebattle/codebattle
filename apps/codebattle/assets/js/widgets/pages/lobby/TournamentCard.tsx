import React from 'react';

import { Box, Flex, Paper, Text } from '@mantine/core';
import moment from 'moment';

import i18n from '../../../i18n';
import TournamentType from '../../components/TournamentType';
// import UserInfo from '../../components/UserInfo';

import ShowButton from './ShowButton';

export interface LobbyTournament {
  id: number;
  name: string;
  type?: string;
  grade?: string;
  state?: string;
  startsAt?: string;
  finishedAt?: string;
  lastRoundEndedAt?: string;
  playersCount?: number;
  [key: string]: unknown;
}

interface TournamentCardProps {
  tournament: LobbyTournament;
  type?: string;
}

function TournamentCard({ tournament }: TournamentCardProps) {
  return (
    <Paper
      shadow="sm"
      withBorder
      radius="md"
      bg="white"
      p="sm"
      mb="sm"
      mx="sm"
      style={{ display: 'flex', flexDirection: 'column' }}
    >
      <Flex direction="column" mb="sm" h="100%">
        <Box component="h4" p="xs" style={{ whiteSpace: 'nowrap' }}>
          {tournament.name}
        </Box>
        <Box component="h5" p="xs" style={{ whiteSpace: 'nowrap' }}>
          {i18n.t('Mode:')} <TournamentType type={tournament.type ?? ''} />
          {` ${tournament.type}`}
        </Box>
        <Text component="span" p="xs" style={{ whiteSpace: 'nowrap' }}>
          {i18n.t('Starts at %{date}', {
            date: moment.utc(tournament.startsAt).local().locale(i18n.language).format('LLL'),
          })}
        </Text>
        <Flex direction="column" className="cb-vw-75">
          <ShowButton url={`/tournaments/${tournament.id}/`} />
        </Flex>
      </Flex>
    </Paper>
  );
}

export default TournamentCard;
