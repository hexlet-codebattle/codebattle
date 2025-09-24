import { useSelector } from 'react-redux';

import {
  tournamentSelector,
  currentTournamentPlayerSelector,
  tournamentMatchesSelector,
  gameStatusSelector,
} from '@/selectors';

import GameStateCodes from '../config/gameStateCodes';
import MatchStateCodes from '../config/matchStates';

const getActiveGameId = (gameStatus, gameId) => {
  if (
    gameStatus?.state !== GameStateCodes.playing
    && gameId
    && gameStatus?.gameId === gameId
  ) {
    return null;
  }

  if (gameStatus?.state === GameStateCodes.playing) {
    return gameStatus?.gameId;
  }

  return gameId;
};

const useTournamentStats = ({ type }) => {
  const gameStatus = useSelector(gameStatusSelector);
  const { user, gameId } = useSelector(currentTournamentPlayerSelector);
  const { taskIds, breakState, state } = useSelector(tournamentSelector);
  const matches = useSelector(tournamentMatchesSelector);

  const taskCount = user?.taskIds?.length || 1;
  const taskSolvedCount = user?.state === 'active' ? taskCount - 1 : taskCount;

  const activeGameId = type === 'tournament'
      ? Object.values(matches).find(
          match => match.state === MatchStateCodes.playing
            && match.playerIds.includes(user?.id),
        )?.gameId
      : getActiveGameId(gameStatus, gameId);

  return {
    state,
    taskCount,
    taskSolvedCount,
    breakState,
    maxPlayerTasks: taskIds?.length,
    activeGameId,
  };
};

export default useTournamentStats;
