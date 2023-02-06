import { createSlice } from '@reduxjs/toolkit';
import GameStateCodes from '../config/gameStateCodes';

const initialState = {
  gameStatus: {
    state: GameStateCodes.initial,
    msg: '',
    type: null,
    startsAt: null,
    score: null, // { gameResults: [{ gameId: 482, insertedAt: "2022-12-02T19:12:40", winnerId: 1 }], opponentOneId: 1, opponentTwoId: 2}
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
    setGameTask: (state, { payload: { task } }) => {
      state.task = task;
    },
    updateCheckStatus: (state, { payload }) => {
      Object.assign(state.gameStatus.checking, payload);
    },
    setTournamentsInfo: (state, { payload }) => {
      state.tournamentsInfo = payload;
    },
  },
});

const { actions, reducer } = game;

export { actions };
export default reducer;
