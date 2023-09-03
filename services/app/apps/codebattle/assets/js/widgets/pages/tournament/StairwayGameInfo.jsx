import React, { memo } from 'react';

import find from 'lodash/find';

import TaskAssignment from '../game/TaskAssignment';

const StairwayGameInfo = ({ tasks, currentTaskId }) => {
  if (!tasks) {
    return null;
  }

  const task = find(tasks, { id: currentTaskId }, null);

  if (!task) {
    return null;
  }

  return <TaskAssignment task={task} />;
};

export default memo(StairwayGameInfo);
