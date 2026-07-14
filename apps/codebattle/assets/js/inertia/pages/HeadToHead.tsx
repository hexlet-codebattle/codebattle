import React from 'react';

import { Head } from '@inertiajs/react';

import { HeadToHeadPage } from '../../widgets/App';

type HeadToHeadPageProps = React.ComponentProps<typeof HeadToHeadPage>;

interface HeadToHeadProps {
  page_title: string;
  head_to_head: HeadToHeadPageProps['headToHead'];
}

export default function HeadToHead({ page_title, head_to_head }: HeadToHeadProps) {
  return (
    <div className="container cb-text shadow-sm py-4">
      <Head title={page_title} />
      <HeadToHeadPage headToHead={head_to_head} />
    </div>
  );
}
