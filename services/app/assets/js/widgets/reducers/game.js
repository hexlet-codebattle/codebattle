import _ from 'lodash';
import { handleActions } from 'redux-actions';
import * as actions from '../actions';
import GameStatusCodes from '../config/gameStatusCodes';

const initialState = {
  gameStatus: {
    status: GameStatusCodes.initial,
    checking: { 1: false, 2: false },
    solutionStatus: null,
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

  [actions.updateGamePlayers](state, { payload }) {
    const { players: playersList } = payload;
    const players = _.reduce(playersList, (acc, player) => ({ ...acc, [player.id]: player }), {});
    return {
      ...state,
      players: {
        ...state.players,
        ...players,
      },
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
