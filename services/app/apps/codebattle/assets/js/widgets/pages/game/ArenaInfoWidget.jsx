import React, { memo } from 'react';

import { useSelector } from 'react-redux';

import ArenaTopLeaderboardPanel from './ArenaTopLeaderboardPanel';
import WaitingRoomPanel from './WaitingRoomPanel';

const ArenaInfoWidget = () => {
  const { user } = useSelector(state => state.tournamentPlayer);
  const { roundTaskIds } = useSelector(state => state.tournament);
  const taskCount = user?.taskIds?.length || 1;
  const taskSolvedCount = user.state === 'active' ? taskCount - 1 : taskCount;

  return (
    <div
      className="d-flex flex-wrap flex-sm-nowrap shadow-sm h-100 rounded-lg bg-white"
    >
      <ArenaTopLeaderboardPanel
        taskCount={taskCount}
        maxPlayerTasks={roundTaskIds.length}
      />
      <WaitingRoomPanel
        taskCount={taskSolvedCount}
        maxPlayerTasks={roundTaskIds.length}
      />
    </div>
  );
};

export default memo(ArenaInfoWidget);
