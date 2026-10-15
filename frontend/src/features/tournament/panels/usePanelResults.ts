import { useEffect, useState } from 'react';

import type { TournamentApi } from '../useTournament';

const POLL_MS = 15_000;

/**
 * `tournament:get_results` for one analytics type (legacy useTournamentPanel):
 * fetched now and every 15 s while the tournament runs, once when it's finished,
 * not at all before the start.
 */
export function usePanelResults<Row>(api: TournamentApi, state: string, params: Record<string, unknown> | null) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [failed, setFailed] = useState(false);
  const key = params ? JSON.stringify(params) : null;

  useEffect(() => {
    if (!key || api.status !== 'joined' || (state !== 'active' && state !== 'finished')) return undefined;

    let alive = true;
    const load = () =>
      api
        .push<{ results: Row[] }>('tournament:get_results', { params: JSON.parse(key) })
        .then(({ results }) => {
          if (alive) {
            setRows(results);
            setFailed(false);
          }
        })
        .catch(() => alive && setFailed(true));

    void load();
    const timer = state === 'active' ? window.setInterval(load, POLL_MS) : undefined;
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [api, state, key]);

  return { rows, failed, waiting: state !== 'active' && state !== 'finished' };
}
