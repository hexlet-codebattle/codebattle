import React from 'react';

import { Box } from '@mantine/core';

import AchievementBadge from './AchievementBadge';
import type { Achievement } from './achievementTypes';

const hiddenAchievementTypes = new Set(['game_stats', 'tournaments_stats']);

interface UserAchievementsProps {
  achievements?: Achievement[] | null;
}

function UserAchievements({ achievements }: UserAchievementsProps) {
  const visibleAchievements = (achievements || []).filter(
    (achievement) => !hiddenAchievementTypes.has(achievement.type),
  );

  if (visibleAchievements.length === 0) {
    return null;
  }

  return (
    <Box className="cb-achievements-grid" mt="sm">
      {visibleAchievements.map((achievement) => (
        <AchievementBadge key={achievement.type} achievement={achievement} />
      ))}
    </Box>
  );
}

export default UserAchievements;
