import { create } from 'zustand';

import type { LobbyGame, LobbyJoinReply, LobbyPlayer, LobbyTournament } from './types';

const byStartsAt = (a: LobbyTournament, b: LobbyTournament) =>
  (a.starts_at ?? '').localeCompare(b.starts_at ?? '');

interface LobbyStore {
  games: LobbyGame[];
  liveTournaments: LobbyTournament[];
  seasonTournaments: LobbyTournament[];

  /** Replace everything from the page props or a (re)join reply. */
  reset: (data: LobbyJoinReply) => void;
  /** `game:upsert` carries a partial game; merge so fields only the full payload has survive. */
  upsertGame: (game: Partial<LobbyGame> & { id: number }) => void;
  removeGame: (gameId: number) => void;
  updatePlayer: (gameId: number, userId: number, patch: Partial<LobbyPlayer>) => void;
  /** An upcoming season tournament opened: it moves to the live list with its new state. */
  activateTournament: (patch: Partial<LobbyTournament> & { id: number }) => void;
  removeTournament: (tournamentId: number) => void;
}

export const useLobbyStore = create<LobbyStore>((set) => ({
  games: [],
  liveTournaments: [],
  seasonTournaments: [],

  reset: (data) =>
    set({
      games: data.active_games,
      liveTournaments: [...data.live_tournaments].sort(byStartsAt),
      seasonTournaments: [...data.season_tournaments].sort(byStartsAt),
    }),

  upsertGame: (game) =>
    set((state) => {
      const index = state.games.findIndex(({ id }) => id === game.id);

      if (index === -1) {
        return { games: [...state.games, game as LobbyGame] };
      }

      const games = [...state.games];
      games[index] = { ...games[index], ...game };

      return { games };
    }),

  removeGame: (gameId) => set((state) => ({ games: state.games.filter(({ id }) => id !== gameId) })),

  updatePlayer: (gameId, userId, patch) =>
    set((state) => ({
      games: state.games.map((game) =>
        game.id === gameId
          ? { ...game, players: game.players.map((player) => (player.id === userId ? { ...player, ...patch } : player)) }
          : game,
      ),
    })),

  activateTournament: (patch) =>
    set((state) => {
      const existing =
        state.liveTournaments.find(({ id }) => id === patch.id) ??
        state.seasonTournaments.find(({ id }) => id === patch.id);
      if (!existing) return state;

      return {
        liveTournaments: [...state.liveTournaments.filter(({ id }) => id !== patch.id), { ...existing, ...patch }].sort(
          byStartsAt,
        ),
        seasonTournaments: state.seasonTournaments.filter(({ id }) => id !== patch.id),
      };
    }),

  removeTournament: (tournamentId) =>
    set((state) => ({
      liveTournaments: state.liveTournaments.filter(({ id }) => id !== tournamentId),
      seasonTournaments: state.seasonTournaments.filter(({ id }) => id !== tournamentId),
    })),
}));
