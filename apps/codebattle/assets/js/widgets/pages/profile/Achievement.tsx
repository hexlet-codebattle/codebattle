import React from 'react';

import AchievementBadge from '../../components/AchievementBadge';
import type { Achievement as AchievementType } from '../../components/achievementTypes';

interface AchievementProps {
  achievement: AchievementType;
}

function Achievement({ achievement }: AchievementProps) {
  return <AchievementBadge achievement={achievement} />;
}

export default Achievement;
