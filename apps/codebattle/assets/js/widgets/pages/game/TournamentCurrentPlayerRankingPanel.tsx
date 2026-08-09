import React, { memo } from 'react';

import { Box, Flex, Paper } from '@mantine/core';

import Notifications from './Notifications';
import TournamentRankingTable from './TournamentRankingTable';

function TournamentCurrentPlayerRankingPanel() {
  return (
    <Paper h="100%" shadow="sm" radius="md" c="white" className="cb-bg-panel cb-rounded">
      <Flex wrap={{ base: 'wrap', sm: 'nowrap' }} h="100%">
        <TournamentRankingTable />
        <Box
          flex="0 1 auto"
          p={0}
          className="cb-border-color cb-game-control-container"
          style={{
            borderLeft: '1px solid var(--mantine-color-default-border)',
            borderTopRightRadius: '0.5rem',
            borderBottomRightRadius: '0.5rem',
          }}
        >
          <Flex direction="column" justify="flex-start" style={{ overflow: 'auto' }} h="100%">
            <Box px="md" py="md" w="100%">
              <Notifications />
            </Box>
          </Flex>
        </Box>
      </Flex>
    </Paper>
  );
}

export default memo(TournamentCurrentPlayerRankingPanel);
