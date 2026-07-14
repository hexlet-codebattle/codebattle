import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import omit from 'lodash/omit';

import { setPlayerToSliceState } from '../utils/gameRoom';

import initial, { defaultGameStatusState, type GameState, type Player } from './initial';

const initialState = initial.game;

const game = createSlice({
  name: 'game',
  initialState,
  reducers: {
    setGameId: (state, { payload: { id } }: PayloadAction<{ id: number }>) => {
      state.id = id;
    },
    clearGameStatus: (state) => {
      state.gameStatus = defaultGameStatusState;
    },
    updateGameStatus: (state, { payload }: PayloadAction<Partial<GameState['gameStatus']>>) => {
      Object.assign(state.gameStatus, payload);
    },
    setGameHeadToHead: (state, { payload }: PayloadAction<{ headToHead: unknown }>) => {
      state.gameStatus.headToHead = payload.headToHead;
    },
    updateRematchStatus: (state, { payload }: PayloadAction<Record<string, unknown>>) => {
      Object.assign(state.gameStatus, payload);
    },
    clearGamePlayers: (state) => {
      if (state.players) {
        state.players = {};
      }
    },
    updateGamePlayers: (
      state,
      { payload: { players: playersList } }: PayloadAction<{ players: Player[] }>,
    ) => {
      const newPlayersState = playersList.reduce(setPlayerToSliceState, state.players);
      state.players = newPlayersState as Record<number, Player>;
    },
    updateCheckStatus: (state, { payload }: PayloadAction<Record<string, unknown>>) => {
      Object.assign(state.gameStatus.checking, payload);
    },
    setTournamentWaitType: (state, { payload }: PayloadAction<string | null>) => {
      state.waitType = payload;
    },
    setTournamentsInfo: (state, { payload }: PayloadAction<Record<string, unknown> | null>) => {
      state.tournamentsInfo = payload;
    },
    setGameTask: (state, { payload: { task } }: PayloadAction<{ task: unknown }>) => {
      state.task = task;
    },
    deleteAlert: (state, { payload }: PayloadAction<string>) => {
      state.alerts = omit(state.alerts, [payload]);
    },
    addAlert: (state, { payload }: PayloadAction<Record<string, unknown>>) => {
      state.alerts = { ...state.alerts, ...payload };
    },
    setAward: (state, { payload }: PayloadAction<unknown>) => {
      state.award = payload;
    },
    setLocked: (state, { payload }: PayloadAction<boolean>) => {
      state.locked = payload;
    },
    setVisible: (state, { payload }: PayloadAction<boolean>) => {
      state.visible = payload;
    },
    toggleVisible: (state) => {
      state.visible = !state.visible;
    },
  },
});

const { actions, reducer } = game;

export { actions };
export default reducer;
