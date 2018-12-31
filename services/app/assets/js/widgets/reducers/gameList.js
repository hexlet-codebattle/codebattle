import { handleActions } from 'redux-actions';
import _ from 'lodash';
import * as actions from '../actions';

const initState = { activeGames: null, completedGames: null };

const gameList = handleActions({
  [actions.fetchGameList](state, { payload: { active_games: activeGames, completed_games: completedGames } }) {
    return { ...state, activeGames, completedGames };
  },
  [actions.newGameLobby](state, { payload: { game } }) {
    const { activeGames } = state;

    const newGame = {
      users: game.data.players.map(player => player.user),
      game_info: {
        state: game.state,
        level: game.data.task.level,
        inserted_at: game.data.inserted_at,
      },
      game_id: game.data.game_id,
    };
    return { ...state, activeGames: [...activeGames, newGame] };
  },
  [actions.cancelGameLobby](state, { payload: { game_id: gameId } }) {
    const { activeGames } = state;

    const newGames = _.filter(activeGames, game => game.game_id !== parseInt(gameId));

    return { ...state, activeGames: newGames };
  },
  [actions.updateGameLobby](state, { payload: { game } }) {
    const gameId = game.data.game_id;

    const { activeGames } = state;
    const filtered = activeGames.filter(g => g.game_id !== parseInt(gameId));

    const newGame = {
      users: game.data.players.map(player => player.user),
      game_info: {
        state: game.state,
        level: game.data.task.level,
        inserted_at: game.data.inserted_at,
      },
      game_id: game.data.game_id,
    };
    return { ...state, activeGames: [...filtered, newGame] };
  },
}, initState);

export default gameList;
