import React from 'react';

import { Box } from '@mantine/core';

import { Lobby } from '../../widgets/App';

export default function LobbyPage() {
  return (
    <Box c="cbText" maw={{ base: '100%', lg: 960 }} mx="auto" style={{ padding: '15px' }}>
      <Lobby />
    </Box>
  );
}
