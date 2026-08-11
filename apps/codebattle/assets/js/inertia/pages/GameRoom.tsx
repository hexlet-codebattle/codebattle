import React from 'react';

import { Box } from '@mantine/core';

import { Game } from '../../widgets/App';

export default function GameRoom() {
  return (
    <Box w="100%">
      <Game />
      <div id="modal-root" style={{ left: 0, position: 'absolute', top: 0 }} />
    </Box>
  );
}
