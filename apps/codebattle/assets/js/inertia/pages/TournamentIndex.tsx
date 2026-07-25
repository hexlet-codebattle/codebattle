import React from 'react';

import { Head } from '@inertiajs/react';

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
    <div className="container-xl cb-text py-4">
      <Head title={page_title} />
      <TournamentIndexPage
        lastTournament={last_tournament}
        taskPackNames={task_pack_names}
        userTimezone={user_timezone}
      />
    </div>
  );
}
