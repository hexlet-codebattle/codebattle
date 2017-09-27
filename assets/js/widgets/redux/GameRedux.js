import _ from 'lodash';
import Immutable from 'seamless-immutable';
import { createReducer } from 'reduxsauce';
import { GameTypes as Types } from './Actions';
import GameStatuses from '../config/gameStatuses';

/* ------------- Initial State ------------- */

export const INITIAL_STATE = Immutable({
  gameStatus: GameStatuses.initial,
});

/* ------------- Reducers ------------- */

const updateStatus = (state, { gameStatus }) => state.merge({ gameStatus });

/* ------------- Hookup Reducers To Types ------------- */
export const reducer = createReducer(INITIAL_STATE, {
  [Types.UPDATE_STATUS]: updateStatus,
});

/* ------------- Selectors ------------- */

export const gameStatusSelector = state => state.gameStatus.gameStatus;
