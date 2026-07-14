import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface StairwayGameState {
  gameStatus: {
    status: string;
    roundsStartsAt: string | null;
    timeoutSeconds: number;
    tournamentId: number | null;
  };
  rounds: unknown;
  players: unknown;
  game: unknown;
}

const initialState: StairwayGameState = {
  gameStatus: {
    status: 'active',
    roundsStartsAt: null,
    timeoutSeconds: 0,
    tournamentId: null,
  },
  rounds: null,
  players: null,
  game: null,
};

const stairwayGame = createSlice({
  name: 'stairwayGame',
  initialState,
  reducers: {
    handleNextRound: () => {},
    setGameData: (state, { payload }: PayloadAction<unknown>) => {
      state.game = payload;
    },
    // changeEditorLang: (state, { payload: { editorLang } }) =>
    // _.update(state, 'editorValue.editorLang', editorLang),
    // reducerName: () => {},
  },
});

const { actions, reducer } = stairwayGame;
export { actions };
export default reducer;
