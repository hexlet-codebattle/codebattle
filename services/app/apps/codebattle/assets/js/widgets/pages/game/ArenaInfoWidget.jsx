import React, { memo } from 'react';

import useTournamentStats from '@/utils/useTournamentStats';

import WaitingRoomStatus from '../../components/WaitingRoomStatus';

import ArenaTopLeaderboardPanel from './ArenaTopLeaderboardPanel';
import WaitingRoomPanel from './WaitingRoomPanel';

const ArenaInfoWidget = () => {
  const {
    taskCount,
    taskSolvedCount,
    maxPlayerTasks,
    activeGameId,
  } = useTournamentStats({ type: 'room' });

  return (
    <div
      className="d-flex flex-wrap flex-sm-nowrap shadow-sm h-100 rounded-lg bg-white"
    >
      <ArenaTopLeaderboardPanel
        taskCount={taskCount}
        maxPlayerTasks={maxPlayerTasks}
      />
      <WaitingRoomPanel>
        <WaitingRoomStatus
          page="game"
          taskCount={taskSolvedCount}
          maxPlayerTasks={maxPlayerTasks}
          activeGameId={activeGameId}
        />
      </WaitingRoomPanel>
    </div>
  );
};

export default memo(ArenaInfoWidget);
