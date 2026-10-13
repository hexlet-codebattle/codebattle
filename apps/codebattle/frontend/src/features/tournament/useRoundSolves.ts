import { useMemo } from 'react';

import { usePanelResults } from './panels/usePanelResults';
import type { Tournament } from './types';
import type { TournamentApi } from './useTournament';

export interface RoundSolves {
  solved: number;
  players: number;
}

/**
 * Per round: players (bots excluded) who solved its task out of those who played it
 * (get_results "round_solves", cached on the server). Refreshed every 15 s while running.
 */
export function useRoundSolves(api: TournamentApi, state: Tournament['state'] | undefined) {
  const { rows } = usePanelResults<{ round_position: number; solved: number; players: number }>(api, state ?? 'upcoming', {
    type: 'round_solves',
  });

  return useMemo(() => {
    const byRound: Record<number, RoundSolves> = {};
    for (const row of rows ?? []) byRound[row.round_position] = { solved: row.solved, players: row.players };
    return byRound;
  }, [rows]);
}
