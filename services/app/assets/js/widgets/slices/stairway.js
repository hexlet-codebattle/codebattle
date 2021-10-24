import { createSlice } from '@reduxjs/toolkit';
import _ from 'lodash';

const initialState = {
  gameStatus: {
      status: 'active',
      roundsStartsAt: null,
      timeoutSeconds: 0,
      tournamentId: null,
  },
  rounds: [
    {
 id: 0, name: 'task-one', level: 'elementary', descriptionRu: '', descriptionEn: '', examples: '',
},
    {
 id: 1, name: 'task-two', level: 'elementary', descriptionRu: '', descriptionEn: '', examples: '',
},
    {
 id: 2, name: 'task-three', level: 'elementary', descriptionRu: '', descriptionEn: '', examples: '',
},
    {
 id: 3, name: 'task-four', level: 'elementary', descriptionRu: '', descriptionEn: '', examples: '',
},
    {
 id: 4, name: 'task-five', level: 'elementary', descriptionRu: '', descriptionEn: '', examples: '',
},
    {
 id: 5, name: 'task-six', level: 'elementary', descriptionRu: '', descriptionEn: '', examples: '',
},
  ],
  players: [
    {
      id: 0,
      name: 'Vova',
      rank: 1600,
      tasks: [
        { roundId: 0, status: 'active', results: {} }, // status: win/lost/active
        { roundId: 1, status: 'active', results: {} },
        { roundId: 2, status: 'active', results: {} },
        { roundId: 3, status: 'active', results: {} },
        { roundId: 4, status: 'active', results: {} },
        { roundId: 5, status: 'active', results: {} },
      ],
    },
    {
      id: 2,
      name: 'Jopa',
      rank: 1600,
      tasks: [
        { roundId: 0, status: 'active', results: {} },
        { roundId: 1, status: 'active', results: {} },
        { roundId: 2, status: 'active', results: {} },
        { roundId: 3, status: 'active', results: {} },
        { roundId: 4, status: 'active', results: {} },
        { roundId: 5, status: 'active', results: {} },
      ],
    },
  ],
};

const stairwayGame = createSlice({
  name: 'stairwayGame',
  initialState,
  reducers: {
    handleNextRound: () => {},
    changeEditorLang: (state, { payload: { editorLang } }) => _.update(state, 'editorValue.editorLang', editorLang),
      // reducerName: () => {},
  },
});

const { actions, reducer } = stairwayGame;
export { actions };
export default reducer;
