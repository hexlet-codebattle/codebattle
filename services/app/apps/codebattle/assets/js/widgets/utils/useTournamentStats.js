import { useSelector } from 'react-redux';

import {
  tournamentSelector,
  currentTournamentPlayerSelector,
} from '@/selectors';

const useTournamentStats = () => {
  const { user } = useSelector(currentTournamentPlayerSelector);
  const { roundTaskIds } = useSelector(tournamentSelector);
  const taskCount = user?.taskIds?.length || 1;
  const taskSolvedCount = user?.state === 'active' ? taskCount - 1 : taskCount;

  return {
    taskCount,
    taskSolvedCount,
    maxPlayerTasks: roundTaskIds?.length,
  };
};

export default useTournamentStats;
