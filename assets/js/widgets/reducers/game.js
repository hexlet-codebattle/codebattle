import { handleActions } from 'redux-actions';
import * as actions from '../actions';
import GameStatusCodes from '../config/gameStatusCodes';

const initialState = {
  gameStatus: {
    status: GameStatusCodes.initial,
    winner: null,
    checking: false,
    solutionStatus: null,
  },
  task: null,
};

export default handleActions({
  [actions.updateGameStatus](state, { payload }) {
    return {
      ...state,
      gameStatus: {
        ...state.gameStatus,
        ...payload
      },
    };
  },
  [actions.setGameTask](state, { payload }) {
    const { task } = payload;
    return { ...state, task };
  },
}, initialState);
