import React from 'react';

import { Head } from '@inertiajs/react';

import { Box } from '@mantine/core';

import { HallOfFamePage } from '../../widgets/App';

type HallOfFamePageProps = React.ComponentProps<typeof HallOfFamePage>;

interface HallOfFameProps {
  page_title: string;
  current_season: HallOfFamePageProps['currentSeason'];
  current_season_results: HallOfFamePageProps['currentSeasonResults'];
  previous_seasons_winners: HallOfFamePageProps['previousSeasonsWinners'];
}

export default function HallOfFame({
  page_title,
  current_season,
  current_season_results,
  previous_seasons_winners,
}: HallOfFameProps) {
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
      <HallOfFamePage
        currentSeason={current_season}
        currentSeasonResults={current_season_results}
        previousSeasonsWinners={previous_seasons_winners}
      />
    </Box>
  );
}
