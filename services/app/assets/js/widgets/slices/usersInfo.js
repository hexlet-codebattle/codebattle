import { createSlice } from '@reduxjs/toolkit';

const initialState = {};

const userInfo = createSlice({
  name: 'userInfo',
  initialState,
  reducers: {
    setUserInfo: (state, { payload: { user } }) => {
      if (user && user.id) state[user.id] = user;
    },
  },
});

const { actions, reducer } = userInfo;

export { actions };

export default reducer;
