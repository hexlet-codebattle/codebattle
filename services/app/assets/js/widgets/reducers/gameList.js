import { handleActions } from 'redux-actions';
import _ from 'lodash';
import * as actions from '../actions';

const initState = { activeGames: null, completedGames: null };

const gameList = handleActions({
  [actions.fetchGameList](state, { payload: { activeGames, completedGames } }) {
    return { ...state, activeGames, completedGames };
  },
  [actions.newGameLobby](state, { payload: { game } }) {
    const { activeGames } = state;
    const newGame = {
      users: game.data.players,
      game_info: {
        state: game.state,
        level: game.data.level,
        starts_at: game.data.starts_at,
      },
      game_id: game.data.game_id,
    };
    return { ...state, activeGames: [...activeGames, newGame] };
  },
  [actions.cancelGameLobby](state, { payload: { gameId } }) {
    const { activeGames } = state;

    const newGames = _.filter(activeGames, game => game.game_id !== gameId);

    return { ...state, activeGames: newGames };
  },
  [actions.updateGameLobby](state, { payload: { game, gameInfo } }) {
    // FIXME: use shape from nackend
    const gameId = game.data.game_id;

    const { activeGames } = state;
    const restGames = activeGames.filter(g => g.game_id !== gameId);

    const newGame = {
      users: game.data.players,
      game_info: {
        ...gameInfo,
        state: gameInfo.status,
      },
      game_id: gameId,
    };
    return { ...state, activeGames: [...restGames, newGame] };
  },
}, initState);

export default gameList;
