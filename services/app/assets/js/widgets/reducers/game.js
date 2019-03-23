import _ from 'lodash';
import { handleActions } from 'redux-actions';
import * as actions from '../actions';
import GameStatusCodes from '../config/gameStatusCodes';

const initialState = {
  gameStatus: {
    status: GameStatusCodes.initial,
    checking: {},
    solutionStatus: null,
    rematchStatus: {},
  },
  task: null,
  players: {},
};

export default handleActions({
  [actions.updateGameStatus](state, { payload }) {
    return {
      ...state,
      gameStatus: {
        ...state.gameStatus,
        ...payload,
      },
    };
  },
  // FIX: I quess this action must be delete and use above action
  [actions.updateRematchStatus](state, { payload }) {
    return {
      ...state,
      gameStatus: {
        ...state.gameStatus,
        rematchStatus: { ...payload },
      },
    };
  },

  [actions.updateGamePlayers](state, { payload: { players: playersList } }) {
    const { players } = state;
    const newPlayersState = playersList.reduce((acc, player) => ({
      ...acc,
      [player.id]: { ...acc[player.id], ...player },
    }), players);

    return {
      ...state,
      players: newPlayersState,
    };
  },

  [actions.setGameTask](state, { payload }) {
    const { task } = payload;
    return { ...state, task };
  },

  [actions.updateCheckStatus](state, { payload }) {
    return {
      ...state,
      gameStatus: {
        ...state.gameStatus,
        checking: {
          ...state.gameStatus.checking,
          ...payload,
        },
      },
    };
  },
}, initialState);
