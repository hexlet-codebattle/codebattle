import { handleActions } from 'redux-actions';
import * as actions from '../actions';

const initialState = {
  // 1: { userId: 1, text: '', currentLang: null },
  // 2: { userId: 2, text: '', currentLang: null },
};

export default handleActions({
  [actions.updateEditorData](state, { payload }) {
    const { userId } = payload;
    return {
      ...state,
      [userId]: {
        ...state[userId],
        ...payload,
      },
    };
  },
}, initialState);

