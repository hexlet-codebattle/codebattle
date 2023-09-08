import { createSlice } from '@reduxjs/toolkit';
import omit from 'lodash/omit';

import { setPlayerToSliceState } from '../utils/gameRoom';

import initial from './initial';

const initialState = initial.game;

const game = createSlice({
  name: 'game',
  initialState,
  reducers: {
    updateGameStatus: (state, { payload }) => {
      Object.assign(state.gameStatus, payload);
    },
    setGameScore: (state, { payload }) => {
      state.gameStatus.score = payload.score;
    },
    updateRematchStatus: (state, { payload }) => {
      Object.assign(state.gameStatus, payload);
    },
    updateGamePlayers: (state, { payload: { players: playersList } }) => {
      const newPlayersState = playersList.reduce(setPlayerToSliceState, state.players);
      state.players = newPlayersState;
    },
    updateCheckStatus: (state, { payload }) => {
      Object.assign(state.gameStatus.checking, payload);
    },
    setTournamentsInfo: (state, { payload }) => {
      state.tournamentsInfo = payload;
    },
    setGameTask: (state, { payload: { task } }) => {
      state.task = task;
    },
    deleteAlert: (state, { payload }) => {
      state.alerts = omit(state.alerts, [payload]);
    },
    addAlert: (state, { payload }) => {
      state.alerts = { ...state.alerts, ...payload };
    },
  },
});

const { actions, reducer } = game;

export { actions };
export default reducer;
