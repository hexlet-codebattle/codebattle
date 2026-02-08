import React from 'react';

import isEmpty from 'lodash/isEmpty';

import AchievementBadge from './AchievementBadge';

const hiddenAchievementTypes = new Set(['game_stats', 'tournaments_stats']);

function UserAchievements({ achievements }) {
  const visibleAchievements = (achievements || [])
    .filter((achievement) => !hiddenAchievementTypes.has(achievement.type));

  if (isEmpty(visibleAchievements)) {
    return '';
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
