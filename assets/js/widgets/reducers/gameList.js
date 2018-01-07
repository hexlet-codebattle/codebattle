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
  [actions.updateGameLobby](state, { payload: { game } }) {
    const gameId = game.data.game_id;

    const { games } = state;
    const filtered = games.filter(g => g.data.game_id !== gameId);

    return { games: [...filtered, game] };
  },
}, initState);

export default gameList;
