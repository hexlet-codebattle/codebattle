import React from 'react';

import { Head } from '@inertiajs/react';

import { Box } from '@mantine/core';

import { TournamentEditPage } from '../../widgets/App';

type TournamentEditPageProps = React.ComponentProps<typeof TournamentEditPage>;

interface TournamentEditProps {
  page_title: string;
  tournament_id: TournamentEditPageProps['tournamentId'];
  task_pack_names: TournamentEditPageProps['taskPackNames'];
  user_timezone: TournamentEditPageProps['userTimezone'];
}

export default function TournamentEdit({
  page_title,
  tournament_id,
  task_pack_names,
  user_timezone,
}: TournamentEditProps) {
  return (
    <Box
      className="cb-text"
      maw={{ base: '100%', xl: 1140 }}
      mx="auto"
      style={{ padding: '15px', paddingTop: '1.5rem', paddingBottom: '1.5rem' }}
    >
      <Head title={page_title} />
      <TournamentEditPage
        tournamentId={tournament_id}
        taskPackNames={task_pack_names}
        userTimezone={user_timezone}
      />
    </Box>
  );
}
