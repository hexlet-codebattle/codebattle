import React from 'react';

import { Box } from '@mantine/core';

import { TournamentPlayerPage } from '../../widgets/App';

export default function TournamentPlayer() {
  return (
    <Box h="100vh" style={{ overflow: 'hidden' }}>
      <TournamentPlayerPage />
    </Box>
  );
}
