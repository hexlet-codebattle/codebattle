import { createSlice } from '@reduxjs/toolkit';
import GameSessionStatusCodes from '../config/gameSessionStatusCodes';

const initialState = {
  status: GameSessionStatusCodes.none,
  players: [],
  task: {},
  initRecords: [],
  records: null,
  replayPlayer: {
    stepCoefficient: 0,
    isShown: false,
  },
};

const gameSession = createSlice({
  name: 'gameSession',
  initialState,
  reducers: {
    loadStoredGameSession: (state, { payload }) => ({
      ...state,
      ...payload,
      status: GameSessionStatusCodes.stored,
      // gameSessionPlayer: { isShown: true },
    }),
    loadActiveGameSession: (state, { payload: records }) => ({
      ...state,
      records,
      status: GameSessionStatusCodes.active,
    }),
    updateGameHistoryRecords: (state, { payload: record }) => {
      state.records.push(record);
    },
    setStepCoefficient: state => {
      state.replayPlayer.stepCoefficient = 1.0 / state.records.length;
    },
    toggleGameSessionPlayer: state => {
      state.replayPlayer.isShown = !state.replayPlayer.isShown;
    },
  },
});

const { actions, reducer } = gameSession;

export { actions };
export default reducer;
