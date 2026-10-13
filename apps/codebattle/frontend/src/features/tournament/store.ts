import { create } from 'zustand';

import { parseUtc } from '@/features/lobby/format';

import type { JoinReply, Match, Player, Report, Tournament } from './types';

// One tournament per page: the channels write here, the panels read.

interface TournamentStore {
  tournament: Tournament | null;
  players: Record<number, Player>;
  matches: Record<number, Match>;
  /** server clock − local clock, so countdowns agree with the server. */
  clockOffsetMs: number;
  /** Bumped when standings change, so ranking views refetch their page. */
  rankingVersion: number;
  /** Admins only (tournament_admin join reply + report events). */
  reports: Report[];
  /** Task names/levels by id, loaded on demand (tournament:get_task) for match rows. */
  tasks: Record<number, { name: string; level: string } | 'loading'>;
  setTask: (id: number, task: { name: string; level: string } | 'loading') => void;
  setReports: (reports: Report[]) => void;
  upsertReport: (report: Report) => void;
  load: (reply: JoinReply) => void;
  merge: (tournament: Partial<Tournament>) => void;
  upsertPlayers: (players: Player[]) => void;
  removePlayer: (id: number) => void;
  upsertMatches: (matches: Match[]) => void;
  bumpRanking: () => void;
}

const byId = <T extends { id: number }>(items: T[] = []) => Object.fromEntries(items.map((item) => [item.id, item]));

const offsetFrom = (tournament: Partial<Tournament>, current: number) =>
  tournament.server_time ? parseUtc(tournament.server_time).getTime() - Date.now() : current;

export const useTournamentStore = create<TournamentStore>((set) => ({
  tournament: null,
  players: {},
  matches: {},
  clockOffsetMs: 0,
  rankingVersion: 0,
  reports: [],
  tasks: {},
  setTask: (id, task) => set((state) => ({ tasks: { ...state.tasks, [id]: task } })),
  setReports: (reports) => set({ reports }),
  upsertReport: (report) =>
    set((state) => ({ reports: [report, ...state.reports.filter((item) => item.id !== report.id)] })),
  load: ({ tournament, players, matches }) =>
    set((state) => ({
      tournament,
      players: { ...state.players, ...byId(players) },
      matches: { ...state.matches, ...byId(matches) },
      clockOffsetMs: offsetFrom(tournament, state.clockOffsetMs),
      rankingVersion: state.rankingVersion + 1,
    })),
  merge: (tournament) =>
    set((state) => ({
      tournament: state.tournament ? { ...state.tournament, ...tournament } : state.tournament,
      clockOffsetMs: offsetFrom(tournament, state.clockOffsetMs),
    })),
  upsertPlayers: (players) =>
    set((state) => ({
      players: {
        ...state.players,
        ...Object.fromEntries(players.map((player) => [player.id, { ...state.players[player.id], ...player }])),
      },
    })),
  removePlayer: (id) =>
    set((state) => {
      const { [id]: _gone, ...players } = state.players;
      return { players };
    }),
  upsertMatches: (matches) =>
    set((state) => ({ matches: { ...state.matches, ...byId(matches) } })),
  bumpRanking: () => set((state) => ({ rankingVersion: state.rankingVersion + 1 })),
}));

/** Creator, listed moderators and admins manage the tournament (the admin channel checks again). */
export function canModerate(tournament: Tournament | null, user: { id: number; is_admin?: boolean }) {
  if (!tournament) return false;
  return Boolean(user.is_admin) || tournament.creator_id === user.id || (tournament.moderator_ids ?? []).includes(user.id);
}
