import { useMemo, useEffect } from 'react';

import TournamentStateCodes from '../config/tournament';
// import { subscribePlayers } from '../middlewares/Tournament';

interface TournamentPlayer {
  id: number | string;
}

export default (players: TournamentPlayer[], tournamentState: string) => {
  const uniqKey = useMemo(
    () =>
      Number(
        players
          .map((p) => p.id)
          .sort()
          .join('') || '0',
      ),
    [players],
  );

  useEffect(() => {
    if (tournamentState === TournamentStateCodes.active) {
      // subscribePlayers(players);
    }

    return () => {};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uniqKey, tournamentState]);
};
