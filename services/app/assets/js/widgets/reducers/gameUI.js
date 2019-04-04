import { handleActions } from 'redux-actions';
import * as actions from '../actions';

const initialState = {
  showToastActionsAfterGame: false,
};

const gameUI = handleActions({
  [actions.updateGameUI](state, { payload }) {
    return {
      ...state,
      ...payload,
    };
  },
}, initialState);

export default gameUI;
