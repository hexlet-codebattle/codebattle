import React from 'react';

import { Head } from '@inertiajs/react';

import { Box } from '@mantine/core';

import { TournamentIndexPage } from '../../widgets/App';

type TournamentIndexPageProps = React.ComponentProps<typeof TournamentIndexPage>;

interface TournamentIndexProps {
  page_title: string;
  last_tournament: TournamentIndexPageProps['lastTournament'];
  task_pack_names: TournamentIndexPageProps['taskPackNames'];
  user_timezone: TournamentIndexPageProps['userTimezone'];
}

export default function TournamentIndex({
  page_title,
  last_tournament,
  task_pack_names,
  user_timezone,
}: TournamentIndexProps) {
  return (
    <Box
      className="cb-text"
      maw={{ base: '100%', xl: 1140 }}
      mx="auto"
      style={{ padding: '15px', paddingTop: '1.5rem', paddingBottom: '1.5rem' }}
    >
      <Head title={page_title} />
      <TournamentIndexPage
        lastTournament={last_tournament}
        taskPackNames={task_pack_names}
        userTimezone={user_timezone}
      />
    </Box>
  );
}
