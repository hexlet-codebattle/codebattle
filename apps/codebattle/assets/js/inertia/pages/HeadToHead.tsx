import React from 'react';

import { Head } from '@inertiajs/react';

import { Box } from '@mantine/core';

import { HeadToHeadPage } from '../../widgets/App';

type HeadToHeadPageProps = React.ComponentProps<typeof HeadToHeadPage>;

interface HeadToHeadProps {
  page_title: string;
  head_to_head: HeadToHeadPageProps['headToHead'];
}

export default function HeadToHead({ page_title, head_to_head }: HeadToHeadProps) {
  return (
    <Box
      c="cbText"
      maw={1140}
      mx="auto"
      style={{
        padding: '15px',
        paddingTop: '1.5rem',
        paddingBottom: '1.5rem',
        boxShadow: 'var(--mantine-shadow-sm)',
      }}
    >
      <Head title={page_title} />
      <HeadToHeadPage headToHead={head_to_head} />
    </Box>
  );
}
