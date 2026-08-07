import React from 'react';

import { Box } from '@mantine/core';

interface GameLevelBadgeProps {
  level: string;
}

function GameLevelBadge({ level }: GameLevelBadgeProps) {
  return (
    <Box
      className="bg-gray cb-rounded"
      p="xs"
      ta="center"
      data-toggle="tooltip"
      data-placement="right"
      title={level}
    >
      <img alt={level} src={`/assets/images/levels/${level}.svg`} />
    </Box>
  );
}

export default GameLevelBadge;
