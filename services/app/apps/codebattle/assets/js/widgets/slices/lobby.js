import { createSlice } from '@reduxjs/toolkit';
import dayjs from 'dayjs';
import find from 'lodash/find';
import reject from 'lodash/reject';

import initial from './initial';

const initialState = {
  activeGames: initial.activeGames,
  seasonTournaments: initial.seasonTournaments,
  liveTournaments: initial.liveTournaments,
  completedTournaments: initial.completedTournaments,
  seasonProfile: initial.seasonProfile,
  presenceList: [],
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
        payload: {
          activeGames,
          tournaments,
          liveTournaments,
          seasonTournaments,
        },
      },
    ) => ({
      ...state,
      activeGames,
      seasonTournaments: seasonTournaments.sort((a, b) => dayjs(a.startsAt).diff(dayjs(b.startsAt), 'millisecond')),
      liveTournaments: liveTournaments.sort((a, b) => dayjs(a.startsAt).diff(dayjs(b.startsAt), 'millisecond')),
      completedTournaments: tournaments.filter(x => !x.isLive),
      channel: { online: true },
    }),
    updateEditorLang: (state, { payload }) => {
      state.activeGames = state.activeGames.map(game => {
        if (game.id === payload.gameId) {
          const newPlayers = game.players.map(player => (player.id === payload.userId
              ? { ...player, editorLang: payload.editorLang }
              : player));

          return { ...game, players: newPlayers };
        }

        return game;
      });
    },
    updateCheckResult: (state, { payload }) => {
      state.activeGames = state.activeGames.map(game => {
        if (game.id === payload.gameId) {
          const newPlayers = game.players.map(player => (player.id === payload.userId
              ? { ...player, checkResult: payload.checkResult }
              : player));

          return { ...game, players: newPlayers };
        }

        return game;
      });
    },
    syncPresenceList: (state, { payload }) => {
      state.presenceList = payload;
      state.mainChannel.online = true;
    },
    removeGameLobby: (state, { payload: { gameId } }) => {
      state.activeGames = reject(state.activeGames, { id: gameId });
    },
    upsertGameLobby: (state, { payload: { game } }) => {
      const gameToUpdate = find(state.activeGames, { id: game.id });
      if (gameToUpdate) {
        Object.assign(gameToUpdate, game);
      } else {
        state.activeGames.push(game);
      }
    },
    selectNewGameTimeout: (state, { payload: { timeoutSeconds } }) => {
      state.newGame.timeoutSeconds = timeoutSeconds;
    },
    finishGame: (state, { payload: { game } }) => {
      state.activeGames = reject(state.activeGames, { id: game.id });
    },
    showCreateGameModal: state => {
      state.createGameModal.show = true;
      state.createGameModal.gameOptions = {};
      state.createGameModal.opponentInfo = null;
    },
    showJoinGameModal: state => {
      state.joinGameModal.show = true;
    },
    closeJoinGameModal: state => {
      state.joinGameModal.show = false;
    },
    closeCreateGameModal: state => {
      state.createGameModal.show = false;
      state.createGameModal.gameOptions = {};
      state.createGameModal.opponentInfo = null;
    },
    showCreateGameInviteModal: (state, { payload: { opponentInfo } }) => {
      state.createGameModal.show = true;
      state.createGameModal.gameOptions = { type: 'invite' };
      state.createGameModal.opponentInfo = opponentInfo;
    },
    updateLobbyChannelState: (state, { payload }) => {
      state.channel.online = payload;
    },
    updateMainChannelState: (state, { payload }) => {
      state.mainChannel.online = payload;
    },
  },
});

const { actions, reducer } = lobby;

export { actions };

export default reducer;
