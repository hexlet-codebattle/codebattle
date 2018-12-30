import { handleActions } from 'redux-actions';
import _ from 'lodash';
import * as actions from '../actions';

const initState = { active_games: null, completed_games: null };

const gameList = handleActions({
  [actions.fetchGameList](state, { payload: { active_games, completed_games } }) {
    return { ...state, active_games: active_games, completed_games: completed_games };
  },
  [actions.newGameLobby](state, { payload: { game } }) {
    const { active_games } = state;

    const new_game = {
      users: game.data.players.map(player => player.user),
      game_info: {
        state: game.state,
        level: game.data.task.level,
        inserted_at: game.data.inserted_at,
      },
      game_id: game.data.game_id,
    };
    return { active_games: [...active_games, new_game] };
  },
  [actions.cancelGameLobby](state, { payload: { game_id } }) {
    const { active_games } = state;

    const new_games = _.filter(active_games, game => game.game_id != parseInt(game_id));

    return { active_games: new_games };
  },
  [actions.updateGameLobby](state, { payload: { game } }) {
    const gameId = game.data.game_id;

    const { active_games } = state;
    const filtered = active_games.filter(g => g.data.game_id !== gameId);

    return { active_games: [...filtered, game] };
  },
}, initState);

export default gameList;
