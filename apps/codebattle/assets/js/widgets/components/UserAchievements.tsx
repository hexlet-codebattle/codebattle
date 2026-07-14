import React from 'react';

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
    <div className="cb-achievements-grid mt-2">
      {visibleAchievements.map((achievement) => (
        <AchievementBadge key={achievement.type} achievement={achievement} />
      ))}
    </div>
  );
}

export default UserAchievements;
