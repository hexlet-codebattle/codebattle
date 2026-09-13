import React from 'react';

import { Box, Tooltip } from '@mantine/core';

interface GameLevelBadgeProps {
  level: string;
}

function GameLevelBadge({ level }: GameLevelBadgeProps) {
  return (
    <Tooltip label={level} position="right" withArrow>
      <Box
        className="bg-gray"
        style={{ borderRadius: 'var(--mantine-radius-md)' }}
        p="xs"
        ta="center"
        title={level}
      >
        <img alt={level} src={`/assets/images/levels/${level}.svg`} />
      </Box>
    </Tooltip>
  );
}

export default GameLevelBadge;
