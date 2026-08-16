import React from 'react';

import { Head } from '@inertiajs/react';

import { Box } from '@mantine/core';

import { SeasonShowPage } from '../../widgets/App';

type SeasonShowProps = React.ComponentProps<typeof SeasonShowPage> & {
  page_title: string;
};

export default function SeasonShow({ page_title, ...props }: SeasonShowProps) {
  return (
    <Box
      maw={1140}
      mx="auto"
      style={{
        padding: '15px',
        paddingTop: '1.5rem',
        paddingBottom: '1.5rem',
        backgroundColor: '#343a40',
        boxShadow: 'var(--mantine-shadow-sm)',
      }}
    >
      <Head title={page_title} />
      <SeasonShowPage {...props} />
    </Box>
  );
}
