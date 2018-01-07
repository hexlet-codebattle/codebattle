import { handleActions } from 'redux-actions';
import * as actions from '../actions';

const initState = { games: [] };

const gameList = handleActions({
  [actions.fetchGameList](state, { payload: { games } }) {
    return { ...state, games };
  },
}, initState);

export default gameList;
