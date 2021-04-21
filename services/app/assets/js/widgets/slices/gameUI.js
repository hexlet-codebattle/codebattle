import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  showToastActionsAfterGame: false,
  isShowGuide: false,
};

const gameUI = createSlice({
  name: 'gameUI',
  initialState,
  reducers: {
    updateGameUI: (state, { payload }) => {
      Object.assign(state, payload);
    },
  },
});

const { actions, reducer } = gameUI;

export { actions };

export default reducer;
