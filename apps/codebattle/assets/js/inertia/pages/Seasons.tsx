import React from 'react';

import { Head } from '@inertiajs/react';

import { Box } from '@mantine/core';

import { SeasonsPage } from '../../widgets/App';

type SeasonsProps = React.ComponentProps<typeof SeasonsPage> & {
  page_title: string;
};

export default function Seasons({ page_title, ...props }: SeasonsProps) {
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
      <SeasonsPage {...props} />
    </Box>
  );
}
