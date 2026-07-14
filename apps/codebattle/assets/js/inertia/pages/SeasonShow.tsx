import React from 'react';

import { Head } from '@inertiajs/react';

import { SeasonShowPage } from '../../widgets/App';

type SeasonShowProps = React.ComponentProps<typeof SeasonShowPage> & {
  page_title: string;
};

export default function SeasonShow({ page_title, ...props }: SeasonShowProps) {
  return (
    <div className="container bg-dark shadow-sm py-4">
      <Head title={page_title} />
      <SeasonShowPage {...props} />
    </div>
  );
}
