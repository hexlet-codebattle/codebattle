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
      id: 1,
      name: 'Vova',
      rank: 1600,
      tasks: [
        { roundId: 0, status: 'win', results: {} }, // status: win/lost/active/disabled
        { roundId: 1, status: 'win', results: {} },
        { roundId: 2, status: 'lost', results: {} },
        { roundId: 3, status: 'active', results: {} },
        { roundId: 4, status: 'disabled', results: {} },
        { roundId: 5, status: 'disabled', results: {} },
      ],
    },
    {
      id: 2,
      name: 'Jopa',
      rank: 1600,
      tasks: [
        { roundId: 0, status: 'lost', results: {} },
        { roundId: 1, status: 'lost', results: {} },
        { roundId: 2, status: 'lost', results: {} },
        { roundId: 3, status: 'lost', results: {} },
        { roundId: 4, status: 'active', results: {} },
        { roundId: 5, status: 'disabled', results: {} },
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
