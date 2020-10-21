import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isShown: false,
};

const replayPlayer = createSlice({
  name: 'replayPlayer',
  initialState,
  reducers: {
    showPlayer: state => {
      state.isShown = true;
    },
    hidePlayer: state => {
      state.isShown = false;
    },
    togglePlayer: state => {
      state.isShown = !state.isShown;
    },
  },
});

const { actions, reducer } = replayPlayer;

export { actions };

export default reducer;
