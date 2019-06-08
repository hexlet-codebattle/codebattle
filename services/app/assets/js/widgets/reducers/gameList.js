import { handleActions } from 'redux-actions';
import _ from 'lodash';
import * as actions from '../actions';

const initialState = {
  activeGames: null, completedGames: null, loaded: false, newGame: { timeoutSeconds: null },
};

const gameList = handleActions({
  [actions.fetchGameList](state, { payload: { activeGames, completedGames } }) {
    return {
      ...state, activeGames, completedGames, loaded: true,
    };
  },
  [actions.newGameLobby](state, { payload: { game } }) {
    const { activeGames } = state;
    return { ...state, activeGames: [...activeGames, game] };
  },
  [actions.cancelGameLobby](state, { payload: { gameId } }) {
    const { activeGames } = state;

    const newGames = _.filter(activeGames, game => game.game_id !== gameId);

    return { ...state, activeGames: newGames };
  },
  [actions.updateGameLobby](state, { payload: { game } }) {
    const gameId = game.game_id;

    const { activeGames } = state;
    const restGames = activeGames.filter(g => g.game_id !== gameId);

    const newGame = {
      players: game.players,
      game_info: game.game_info,
      game_id: gameId,
    };
    return { ...state, activeGames: [...restGames, newGame] };
  },
  [actions.selectNewGameTimeout](state, { payload: { timeoutSeconds } }) {
    const { newGame } = state;
    return { ...state, newGame: { ...newGame, timeoutSeconds } };
  },
}, initialState);

export default gameList;
