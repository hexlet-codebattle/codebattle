import React from 'react';

import { Head } from '@inertiajs/react';

import { TournamentIndexPage } from '../../widgets/App';

type TournamentIndexPageProps = React.ComponentProps<typeof TournamentIndexPage>;

interface TournamentIndexProps {
  page_title: string;
  tournaments: TournamentIndexPageProps['tournaments'];
  task_pack_names: TournamentIndexPageProps['taskPackNames'];
  user_timezone: TournamentIndexPageProps['userTimezone'];
}

export default function TournamentIndex({
  page_title,
  tournaments,
  task_pack_names,
  user_timezone,
}: TournamentIndexProps) {
  return (
    <div className="container-xl cb-text py-4">
      <Head title={page_title} />
      <TournamentIndexPage
        tournaments={tournaments}
        taskPackNames={task_pack_names}
        userTimezone={user_timezone}
      />
    </div>
  );
}
