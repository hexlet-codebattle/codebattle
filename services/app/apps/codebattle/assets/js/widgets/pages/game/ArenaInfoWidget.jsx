import React, { memo } from 'react';

import { useSelector } from 'react-redux';

import ArenaTopLeaderboardPanel from './ArenaTopLeaderboardPanel';
import WaitingRoomPanel from './WaitingRoomPanel';

const maxPlayerTasks = 7;

const ArenaInfoWidget = () => {
  const { user } = useSelector(state => state.tournamentPlayer);
  const taskCount = user?.taskIds?.length || 1;

  return (
    <div
      className="d-flex flex-wrap flex-sm-nowrap shadow-sm h-100 rounded-lg bg-white"
    >
      <ArenaTopLeaderboardPanel
        taskCount={taskCount}
        maxPlayerTasks={maxPlayerTasks}
      />
      <WaitingRoomPanel
        taskCount={taskCount}
        maxPlayerTasks={maxPlayerTasks}
      />
    </div>
  );
};

export default memo(ArenaInfoWidget);
