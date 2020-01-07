import { createReducer } from '@reduxjs/toolkit';
import * as actions from '../actions';
import GameStatusCodes from '../config/gameStatusCodes';

const initialState = {
  gameStatus: {
    status: GameStatusCodes.initial,
    checking: {},
    solutionStatus: null,
  },
  task: null,
  players: {},
};

export default createReducer(initialState, {
  [actions.updateGameStatus](state, { payload }) {
    Object.assign(state.gameStatus, payload);
  },

  [actions.updateGamePlayers](state, { payload: { players: playersList } }) {
    const { players } = state;
    const newPlayersState = playersList.reduce((acc, player) => ({
      ...acc,
      [player.id]: { ...acc[player.id], ...player },
    }), players);

    state.players = newPlayersState;
  },

  [actions.setGameTask](state, { payload: { task } }) {
    state.task = task;
  },

  [actions.updateCheckStatus](state, { payload }) {
    Object.assign(state.gameStatus.checking, payload);
  },
});
