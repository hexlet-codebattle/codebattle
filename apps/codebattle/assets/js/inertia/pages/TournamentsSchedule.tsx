import React from 'react';

import { Head } from '@inertiajs/react';

import { Box } from '@mantine/core';

import { TournamentsSchedulePage } from '../../widgets/App';

interface TournamentsScheduleProps {
  page_title: string;
}

export default function TournamentsSchedule({ page_title }: TournamentsScheduleProps) {
  return (
    <Box c="cbText" maw={{ base: '100%', lg: 960 }} mx="auto" style={{ padding: '15px' }}>
      <Head title={page_title} />
      <TournamentsSchedulePage />
    </Box>
  );
}
