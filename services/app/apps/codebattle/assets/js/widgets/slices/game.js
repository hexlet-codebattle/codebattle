import { createSlice } from '@reduxjs/toolkit';
import GameStateCodes from '../config/gameStateCodes';
import GameRoomModes from '../config/gameModes';

const initialState = {
  gameStatus: {
    state: GameStateCodes.initial,
    msg: '',
    type: null,
    mode: GameRoomModes.none,
    startsAt: null,
    score: null,
    timeoutSeconds: null,
    rematchState: null,
    rematchInitiatorId: null,
    checking: {},
    solutionStatus: null,
  },
  task: null,
  players: {},
  tournamentsInfo: null,
};

const game = createSlice({
  name: 'game',
  initialState,
  reducers: {
    updateGameStatus: (state, { payload }) => {
      Object.assign(state.gameStatus, payload);
    },
    setGameScore: (state, { payload }) => {
      state.gameStatus.score = payload.score;
    },
    updateRematchStatus: (state, { payload }) => {
      Object.assign(state.gameStatus, payload);
    },
    updateGamePlayers: (state, { payload: { players: playersList } }) => {
      const newPlayersState = playersList.reduce(
        (acc, player) => ({
          ...acc,
          [player.id]: { ...acc[player.id], ...player },
        }),
        state.players,
      );
      state.players = newPlayersState;
    },
    updateCheckStatus: (state, { payload }) => {
      Object.assign(state.gameStatus.checking, payload);
    },
    setTournamentsInfo: (state, { payload }) => {
      state.tournamentsInfo = payload;
    },
    setGameTask: (state, { payload: { task } }) => {
      state.task = task;
    },
  },
});

const { actions, reducer } = game;

export { actions };
export default reducer;
