
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  gameStatus: {
      status: 'active',
      startsAt: null,
      timeoutSeconds: 0,
      tournamentId: null,
  },
  tasks: [
    { id: 1, name: 'task-one', level: "elementary", descriptionRu: "", descriptionEn: "", examples: "" },
    { id: 2, name: 'task-two', level: "elementary", descriptionRu: "", descriptionEn: "", examples: "" },
    { id: 3, name: 'task-three', level: "elementary", descriptionRu: "", descriptionEn: "", examples: "" },
    { id: 4, name: 'task-four', level: "elementary", descriptionRu: "", descriptionEn: "", examples: "" },
    { id: 5, name: 'task-five', level: "elementary", descriptionRu: "", descriptionEn: "", examples: "" },
    { id: 6, name: 'task-six', level: "elementary", descriptionRu: "", descriptionEn: "", examples: "" },
  ],
  players: [
    {
      id: 1,
      name: "Vova",
      tasks: [
        { id: 1, status: "active", results: {} }, // status: win/cancel/active
        { id: 2, status: "active", results: {} },
        { id: 3, status: "active", results: {} },
        { id: 4, status: "active", results: {} },
        { id: 5, status: "active", results: {} },
        { id: 6, status: "active", results: {} },
      ],
    },
    {
      id: 2,
      name: 'Jopa',
      tasks: [
        { id: 1, status: 'active', results: {} },
        { id: 2, status: 'active', results: {} },
        { id: 3, status: 'active', results: {} },
        { id: 4, status: 'active', results: {} },
        { id: 5, status: 'active', results: {} },
        { id: 6, status: 'active', results: {} },
      ],
    },
  ],
  outputs: [
    { taskId: 1, result: {} },
    { taskId: 2, result: {} },
    { taskId: 3, result: {} },
    { taskId: 4, result: {} },
    { taskId: 5, result: {} },
    { taskId: 6, result: {} },
  ],
  editorValues: [
    { taskId: 1, editorText: "1", editorLang: "js"},
    { taskId: 2, editorText: "2", editorLang: "js"},
    { taskId: 3, editorText: "3", editorLang: "js"},
    { taskId: 4, editorText: "4", editorLang: "js"},
    { taskId: 5, editorText: "5", editorLang: "js"},
    { taskId: 6, editorText: "6", editorLang: "js"},
  ],
};

const stairwayGame = createSlice({
  name: 'stairwayGame',
  initialState,
  reducers: {
      // reducerName: () => {},
  },
});

const { actions, reducer } = stairwayGame;
export { actions };
export default reducer;
