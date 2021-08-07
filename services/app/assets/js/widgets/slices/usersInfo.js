import { createSlice } from '@reduxjs/toolkit';

const initialState = {};

const userInfo = createSlice({
  name: 'userInfo',
  initialState,
  reducers: {
    setUserInfo: (state, { payload: { user } }) => {
      state[user.id] = user;
    },
    fetchLangStats: (state, { payload }) => {
      payload;
    },
  },
});

const { actions, reducer } = userInfo;

export { actions };

export default reducer;
