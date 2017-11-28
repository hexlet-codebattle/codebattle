import Immutable from 'seamless-immutable';
import { createReducer } from 'reduxsauce';
import { GameTypes as Types } from './Actions';
import GameStatuses from '../config/gameStatuses';
import i18n from '../../i18n';

/* ------------- Initial State ------------- */

export const INITIAL_STATE = Immutable({
  gameStatus: {
    status: GameStatuses.initial,
    winner: {},
    checking: false,
    solutionStatus: null,
  },
  task: null,
});

/* ------------- Reducers ------------- */

// FIXME: validate recieved status
const updateStatus = (state, { gameStatus }) =>
  state.merge({ gameStatus }, { deep: true });

const setTask = (state, { task }) => state.merge({ task });

/* ------------- Hookup Reducers To Types ------------- */
export const reducer = createReducer(INITIAL_STATE, {
  [Types.UPDATE_STATUS]: updateStatus,
  [Types.SET_TASK]: setTask,
});

/* ------------- Selectors ------------- */

export const gameStatusSelector = state => state.gameStatus.gameStatus;

export const gameStatusTitleSelector = (state) => {
  const gameStatus = gameStatusSelector(state);
  switch (gameStatus.status) {
    case GameStatuses.waitingOpponent:
      return i18n
        .t('State: {{state}}', { state: i18n.t('Waiting opponent') });
    case GameStatuses.playing:
      return i18n
        .t('State: {{state}}', { state: i18n.t('Playing') });
    case GameStatuses.playerWon:
      return i18n
        .t('The winner is: {{name}}', { name: gameStatus.winner.name });
    case GameStatuses.gameOver:
      return i18n
        .t('Game over. The winner is: {{name}}', { name: gameStatus.winner.name });
    default:
      return '';
  }
};

// FIXME: rename first-level "gameStatus" to "game"
export const gameTaskSelector = state => state.gameStatus.task;
