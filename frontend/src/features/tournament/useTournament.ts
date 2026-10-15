import { useMemo } from 'react';

import { useChannel } from '@/api/useChannel';
import { playTournamentSound } from '@/shared/sound';
import { useSharedProps } from '@/shared/useSharedProps';

import { canModerate, useTournamentStore } from './store';
import type { JoinReply, Match, Player, Report, Tournament } from './types';

type Push = <Reply = unknown>(event: string, payload?: Record<string, unknown>) => Promise<Reply>;

/**
 * Joins `tournament:<id>` (everyone) and, for moderators, `tournament_admin:<id>`;
 * both feed the tournament store. Returns the pushes the panels use.
 */
export function useTournament(id: number, accessToken: string | null) {
  const { current_user: me } = useSharedProps();
  const store = useTournamentStore;
  const tournament = useTournamentStore((state) => state.tournament);
  const moderator = canModerate(tournament, me);

  // Handlers shared by both channels (the admin one sees every match and player).
  const events = useMemo(() => {
    const { merge, upsertMatches, upsertPlayers, removePlayer, bumpRanking } = store.getState();
    const tournamentUpdate = ({ tournament: next }: { tournament: Partial<Tournament> }) => {
      merge(next);
      bumpRanking();
    };

    return {
      'tournament:match:upserted': ({ match, players }: { match: Match; players?: Player[] }) => {
        upsertMatches([match]);
        if (players?.length) upsertPlayers(players);
      },
      'tournament:round_created': tournamentUpdate,
      'tournament:round_finished': tournamentUpdate,
      'tournament:finished': tournamentUpdate,
      'tournament:restarted': ({ tournament: next, players }: { tournament: Tournament; players?: Player[] }) => {
        useTournamentStore.setState({ players: {}, matches: {} });
        merge(next);
        upsertPlayers(players ?? []);
        bumpRanking();
      },
      'tournament:player:joined': ({ player, tournament: next }: { player: Player; tournament: Partial<Tournament> }) => {
        upsertPlayers([player]);
        merge(next);
      },
      'tournament:player:left': ({ player_id: playerId, tournament: next }: { player_id: number; tournament: Partial<Tournament> }) => {
        removePlayer(playerId);
        merge(next);
      },
      'tournament:ranking_update': () => bumpRanking(),
      // Admin channel: full refreshes after cancel / show results / ladder changes.
      'tournament:update': ({ tournament: next, players, matches }: { tournament: Partial<Tournament>; players?: Player[]; matches?: Match[] }) => {
        merge(next);
        if (players?.length) upsertPlayers(players);
        if (matches?.length) upsertMatches(matches);
        bumpRanking();
      },
    };
  }, [store]);

  const main = useChannel(`tournament:${id}`, {
    params: accessToken ? { access_token: accessToken } : {},
    onJoin: (reply: JoinReply) => store.getState().load(reply),
    events: {
      ...events,
      // Cues as in legacy: the first round is the start, later rounds their own sound;
      // a round ending plays unless it ended the tournament.
      'tournament:round_created': (payload: { tournament: Partial<Tournament> }) => {
        playTournamentSound(payload.tournament?.current_round_position === 0 ? 'started' : 'roundStarted');
        events['tournament:round_created'](payload);
      },
      'tournament:round_finished': (payload: { tournament: Partial<Tournament> }) => {
        if (payload.tournament?.state !== 'finished') playTournamentSound('roundFinished');
        events['tournament:round_finished'](payload);
      },
      'tournament:finished': (payload: { tournament: Partial<Tournament> }) => {
        playTournamentSound('finished');
        events['tournament:finished'](payload);
      },
      // Ladder ticks: refresh the caller's matches and the standings.
      'tournament:results_updated': () => {
        store.getState().bumpRanking();
        const current = store.getState().tournament;
        if (current?.type === 'ladder' && store.getState().players[me.id]) {
          void main
            .push<{ matches: Match[]; players: Player[] }>('tournament:matches:request', { player_id: me.id })
            .then(({ matches, players }) => {
              store.getState().upsertMatches(matches);
              store.getState().upsertPlayers(players);
            })
            .catch(() => undefined);
        }
      },
    },
  });

  const admin = useChannel(moderator ? `tournament_admin:${id}` : null, {
    onJoin: (reply: JoinReply & { reports?: Report[] }) => {
      store.getState().load(reply);
      store.getState().setReports(reply.reports ?? []);
    },
    events: {
      ...events,
      'tournament:report:pending': ({ report }: { report: Report }) => store.getState().upsertReport(report),
      'tournament:report:updated': ({ report }: { report: Report }) => store.getState().upsertReport(report),
    },
  });

  const adminStatus = moderator ? admin.status : null;

  // Stable between renders, so panels can depend on it without refetching.
  return useMemo(
    () => ({
      status: main.status,
      adminStatus,
      moderator,
      push: main.push as Push,
      /** Fire-and-forget on the main channel (join / leave answer with player events). */
      cast: main.cast,
      adminPush: admin.push as Push,
      /** Most admin events never reply; their effect comes back as channel events. */
      adminCast: admin.cast,
    }),
    [main.status, adminStatus, moderator, main.push, main.cast, admin.push, admin.cast],
  );
}

export type TournamentApi = ReturnType<typeof useTournament>;
