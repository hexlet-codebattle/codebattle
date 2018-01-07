import { handleActions } from 'redux-actions';
import * as actions from '../actions';

const initState = { games: [] };

const gameList = handleActions({
  [actions.fetchGameList](state, { payload: { games } }) {
    return { ...state, games };
  },
  [actions.newGameLobby](state, { payload: { game } }) {
    const { games } = state;
    return { games: [...games, game] };
  },
}, initState);

export default gameList;
