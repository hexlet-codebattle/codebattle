import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useTournamentStore } from '../store';
import type { Match, Player } from '../types';
import type { TournamentApi } from '../useTournament';

import { PanelMessage } from './common';
import { MatchCards } from './MatchCards';

// Only moderators get the live match feed; everyone else re-polls the list.
const REFRESH_MS = 10_000;

/** Games being played right now, to watch — e.g. once the viewer's own games are done. */
export function LiveGamesPanel({ api }: { api: TournamentApi }) {
  const { t } = useTranslation();
  const [liveIds, setLiveIds] = useState<number[] | null>(null);
  const allMatches = useTournamentStore((state) => state.matches);

  useEffect(() => {
    if (api.status !== 'joined') return undefined;
    const load = () =>
      api
        .push<{ matches: Match[]; players: Player[] }>('tournament:matches:request_live')
        .then(({ matches, players }) => {
          useTournamentStore.getState().upsertMatches(matches);
          useTournamentStore.getState().upsertPlayers(players ?? []);
          setLiveIds(matches.map((match) => match.id));
        })
        .catch(() => undefined);
    load();
    const timer = window.setInterval(load, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [api]);

  // The store has the freshest state (moderators get every match update): drop games that ended since.
  const matches = useMemo(
    () => (liveIds ?? []).map((id) => allMatches[id]).filter((match): match is Match => match?.state === 'playing'),
    [liveIds, allMatches],
  );

  if (liveIds == null) return <PanelMessage loading />;

  return <MatchCards api={api} matches={matches} emptyText={t('No games are being played right now.')} />;
}
