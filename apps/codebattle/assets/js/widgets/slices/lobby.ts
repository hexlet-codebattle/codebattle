import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import find from 'lodash/find';
import reject from 'lodash/reject';

import dayjs from '../../i18n/dayjs';

import initial from './initial';
import { actions as tournamentActions } from './tournament';

interface LobbyPlayer {
  id: number;
  editorLang?: string;
  checkResult?: unknown;
  [key: string]: unknown;
}

interface LobbyGame {
  id: number;
  players: LobbyPlayer[];
  [key: string]: unknown;
}

interface LobbyTournament {
  id: number;
  isLive?: boolean;
  startsAt?: string;
  state?: string;
  [key: string]: unknown;
}

export interface LobbyState {
  activeGames: LobbyGame[];
  seasonTournaments: LobbyTournament[];
  liveTournaments: LobbyTournament[];
  completedTournaments: LobbyTournament[];
  seasonProfile: unknown;
  presenceList: unknown[];
  nearbyUsers: number[];
  newGame: { timeoutSeconds: number | null };
  joinGameModal: { show: boolean };
  createGameModal: {
    show: boolean;
    gameOptions: Record<string, unknown>;
    opponentInfo: unknown;
  };
  mainChannel: { online: boolean };
  channel: { online: boolean };
}

const sortByStartsAt = (a: LobbyTournament, b: LobbyTournament) =>
  dayjs(a.startsAt).diff(dayjs(b.startsAt), 'millisecond');

const initialState: LobbyState = {
  activeGames: initial.activeGames as LobbyGame[],
  seasonTournaments: initial.seasonTournaments as LobbyTournament[],
  liveTournaments: initial.liveTournaments as LobbyTournament[],
  completedTournaments: initial.completedTournaments as LobbyTournament[],
  seasonProfile: initial.seasonProfile,
  presenceList: [],
  nearbyUsers: [],
  newGame: { timeoutSeconds: null },
  joinGameModal: {
    show: false,
  },
  createGameModal: {
    show: false,
    gameOptions: {},
    opponentInfo: null,
  },
  mainChannel: {
    online: false,
  },
  channel: {
    online: false,
  },
};

const lobby = createSlice({
  name: 'lobby',
  initialState,
  reducers: {
    initGameList: (
      state,
      {
        payload: { activeGames, tournaments, liveTournaments, seasonTournaments },
      }: PayloadAction<{
        activeGames: LobbyGame[];
        tournaments: LobbyTournament[];
        liveTournaments: LobbyTournament[];
        seasonTournaments: LobbyTournament[];
      }>,
    ) => ({
      ...state,
      activeGames,
      seasonTournaments: seasonTournaments.sort(sortByStartsAt),
      liveTournaments: liveTournaments.sort(sortByStartsAt),
      completedTournaments: tournaments.filter((x) => !x.isLive),
      channel: { online: true },
    }),
    updateEditorLang: (
      state,
      { payload }: PayloadAction<{ gameId: number; userId: number; editorLang: string }>,
    ) => {
      state.activeGames = state.activeGames.map((game) => {
        if (game.id === payload.gameId) {
          const newPlayers = game.players.map((player) =>
            player.id === payload.userId ? { ...player, editorLang: payload.editorLang } : player,
          );

          return { ...game, players: newPlayers };
        }

        return game;
      });
    },
    updateCheckResult: (
      state,
      { payload }: PayloadAction<{ gameId: number; userId: number; checkResult: unknown }>,
    ) => {
      state.activeGames = state.activeGames.map((game) => {
        if (game.id === payload.gameId) {
          const newPlayers = game.players.map((player) =>
            player.id === payload.userId ? { ...player, checkResult: payload.checkResult } : player,
          );

          return { ...game, players: newPlayers };
        }

        return game;
      });
    },
    syncPresenceList: (state, { payload }: PayloadAction<unknown[]>) => {
      state.presenceList = payload;
      state.mainChannel.online = true;
    },
    removeGameLobby: (state, { payload: { gameId } }: PayloadAction<{ gameId: number }>) => {
      state.activeGames = reject(state.activeGames, { id: gameId });
    },
    upsertGameLobby: (state, { payload: { game } }: PayloadAction<{ game: LobbyGame }>) => {
      const gameToUpdate = find(state.activeGames, { id: game.id });
      if (gameToUpdate) {
        Object.assign(gameToUpdate, game);
      } else {
        state.activeGames.push(game);
      }
    },
    selectNewGameTimeout: (
      state,
      { payload: { timeoutSeconds } }: PayloadAction<{ timeoutSeconds: number | null }>,
    ) => {
      state.newGame.timeoutSeconds = timeoutSeconds;
    },
    finishGame: (state, { payload: { game } }: PayloadAction<{ game: LobbyGame }>) => {
      state.activeGames = reject(state.activeGames, { id: game.id });
    },
    showCreateGameModal: (state) => {
      state.createGameModal.show = true;
      state.createGameModal.gameOptions = {};
      state.createGameModal.opponentInfo = null;
    },
    showJoinGameModal: (state) => {
      state.joinGameModal.show = true;
    },
    closeJoinGameModal: (state) => {
      state.joinGameModal.show = false;
    },
    closeCreateGameModal: (state) => {
      state.createGameModal.show = false;
      state.createGameModal.gameOptions = {};
      state.createGameModal.opponentInfo = null;
    },
    showCreateGameInviteModal: (
      state,
      { payload: { opponentInfo } }: PayloadAction<{ opponentInfo: unknown }>,
    ) => {
      state.createGameModal.show = true;
      state.createGameModal.gameOptions = { type: 'invite' };
      state.createGameModal.opponentInfo = opponentInfo;
    },
    updateLobbyChannelState: (state, { payload }: PayloadAction<boolean>) => {
      state.channel.online = payload;
    },
    updateMainChannelState: (state, { payload }: PayloadAction<boolean>) => {
      state.mainChannel.online = payload;
    },
    setNearbyUsers: (state, { payload }: PayloadAction<{ users: Array<{ id: number }> }>) => {
      state.nearbyUsers = payload.users.map((u) => u.id);
    },
  },
  extraReducers: (builder) => {
    builder.addCase(tournamentActions.changeTournamentState, (state, { payload }) => {
      const seasonTournament = state.seasonTournaments.find((t) => t.id === payload.id);
      const liveTournament = state.liveTournaments.find((t) => t.id === payload.id);

      if (seasonTournament) {
        state.seasonTournaments = state.seasonTournaments.filter((t) => t.id !== payload.id);
        state.liveTournaments = [
          ...state.liveTournaments,
          { ...seasonTournament, state: payload.state },
        ].sort(sortByStartsAt);
      }

      if (liveTournament) {
        state.liveTournaments = state.liveTournaments.map((t) =>
          t.id === payload.id ? { ...t, state: payload.state } : t,
        );
      }
    });
  },
});

const { actions, reducer } = lobby;

export { actions };

export default reducer;
