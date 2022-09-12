import React, { memo } from 'react';

import _ from 'lodash';
import Task from './Task';

const StairwayGameInfo = ({ tasks, currentTaskId }) => {
  if (!tasks) {
    return null;
  }

  const task = _.find(tasks, { id: currentTaskId }, null);

  if (!task) {
    return null;
  }

  return <Task task={task} />;
};

export default memo(StairwayGameInfo);
