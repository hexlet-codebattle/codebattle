import { useMemo } from 'react';

import { sortGames } from './format';
import { useLobbyStore } from './store';

/** Joinable or watchable lobby games, the current user's first. */
export function useVisibleGames(userId: number) {
  const games = useLobbyStore((state) => state.games);

  return useMemo(
    () => sortGames(games.filter((game) => game.state === 'playing' || game.state === 'waiting_opponent'), userId),
    [games, userId],
  );
}
