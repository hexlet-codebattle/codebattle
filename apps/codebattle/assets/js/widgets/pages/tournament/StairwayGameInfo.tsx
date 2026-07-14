import React, { memo } from 'react';

import find from 'lodash/find';

import TaskAssignment, { type GameTask } from '../game/TaskAssignment';

type StairwayGameInfoTask = GameTask & { id: number };

interface StairwayGameInfoProps {
  tasks?: StairwayGameInfoTask[];
  currentTaskId: number;
}

function StairwayGameInfo({ tasks, currentTaskId }: StairwayGameInfoProps) {
  if (!tasks) {
    return null;
  }

  const task = find(tasks, { id: currentTaskId });

  if (!task) {
    return null;
  }

  // The stairway view renders TaskAssignment with only `task`; its other props are optional here.
  const Assignment = TaskAssignment as React.ComponentType<{ task: GameTask }>;
  return <Assignment task={task} />;
}

export default memo(StairwayGameInfo);
