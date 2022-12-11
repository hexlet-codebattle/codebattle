import _ from 'lodash';
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
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
    handleNextRound: () => { },
    setGameData: (state, { payload }) => {
      state.game = payload;
    },
    changeEditorLang: (state, { payload: { editorLang } }) => _.update(state, 'editorValue.editorLang', editorLang),
  },
});

const { actions, reducer } = stairwayGame;
export { actions };
export default reducer;
