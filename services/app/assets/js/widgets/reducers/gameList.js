import { handleActions } from 'redux-actions';
import _ from 'lodash';
import * as actions from '../actions';

const initState = { games: null };

const gameList = handleActions({
  [actions.fetchGameList](state, { payload: { games } }) {
    return { ...state, games };
  },
  [actions.newGameLobby](state, { payload: { game } }) {
    const { games } = state;

    const new_game = {
      users: game.data.players.map(player => player.user),
      game_info: {
        state: game.state,
        level: game.data.task.level,
        inserted_at: game.data.inserted_at,
      },
      game_id: game.data.game_id,
    };
    return { games: [...games, new_game] };
  },
  [actions.cancelGameLobby](state, { payload: { game_id } }) {
    const { games } = state;

    const new_games = _.filter(games, game => game.game_id != parseInt(game_id));

    return { games: new_games };
  },
  [actions.updateGameLobby](state, { payload: { game } }) {
    const gameId = game.data.game_id;

    const { games } = state;
    const filtered = games.filter(g => g.data.game_id !== gameId);

    return { games: [...filtered, game] };
  },
}, initState);

export default gameList;
