import React from 'react';

import { Head } from '@inertiajs/react';

import { SeasonsPage } from '../../widgets/App';

type SeasonsProps = React.ComponentProps<typeof SeasonsPage> & {
  page_title: string;
};

export default function Seasons({ page_title, ...props }: SeasonsProps) {
  return (
    <div className="container bg-dark shadow-sm py-4">
      <Head title={page_title} />
      <SeasonsPage {...props} />
    </div>
  );
}
