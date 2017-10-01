import _ from 'lodash';
import Immutable from 'seamless-immutable';
import { createReducer } from 'reduxsauce';
import { GameTypes as Types } from './Actions';
import GameStatuses from '../config/gameStatuses';
import i18next from '../../i18n';

/* ------------- Initial State ------------- */

export const INITIAL_STATE = Immutable({
  gameStatus: {
    status: GameStatuses.initial,
    winner: '',
  },
});

/* ------------- Reducers ------------- */

const updateStatus = (state, { gameStatus }) => state.merge({ gameStatus });

/* ------------- Hookup Reducers To Types ------------- */
export const reducer = createReducer(INITIAL_STATE, {
  [Types.UPDATE_STATUS]: updateStatus,
});

/* ------------- Selectors ------------- */

export const gameStatusSelector = state => state.gameStatus.gameStatus;

export const gameStatusTitleSelector = (state) => {
  const gameStatus = gameStatusSelector(state);
  switch (gameStatus.status) {
    case GameStatuses.waitingOpponent:
      return i18next
        .t('State: {{state}}', { state: i18next.t('Waiting opponent') });
    case GameStatuses.playing:
      return i18next
        .t('State: {{state}}', { state: i18next.t('Playing') });
    case GameStatuses.playerWon:
    case GameStatuses.gameOver:
      return i18next
        .t('The winner is: {{name}}', { name: gameStatus.winner });
    default:
      return '';
  }
};
