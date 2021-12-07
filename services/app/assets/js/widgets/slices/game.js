import { createSlice } from '@reduxjs/toolkit';
import GameStatusCodes from '../config/gameStatusCodes';

const initialState = {
  gameStatus: {
    status: GameStatusCodes.initial,
    checking: {},
    solutionStatus: null,
  },
  task: null,
  players: {},
  tournamentsInfo: null,
};

const game = createSlice({
  name: 'game',
  initialState,
  reducers: {
    updateGameStatus: (state, { payload }) => {
      Object.assign(state.gameStatus, payload);
    },
    updateRematchStatus: (state, { payload }) => {
      state.gameStatus.status = payload.rematchState;
    },
    updateGamePlayers: (state, { payload: { players: playersList } }) => {
      const newPlayersState = playersList.reduce(
        (acc, player) => ({
          ...acc,
          [player.id]: { ...acc[player.id], ...player },
        }),
        state.players,
      );
      state.players = newPlayersState;
    },
    setGameTask: (state, { payload: { task } }) => {
      state.task = task;
    },
    updateCheckStatus: (state, { payload }) => {
      Object.assign(state.gameStatus.checking, payload);
    },
    setTournamentsInfo: (state, { payload }) => {
      state.tournamentsInfo = payload;
    },
  },
});

const { actions, reducer } = game;

export { actions };
export default reducer;
