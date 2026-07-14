import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface UserInfo {
  id: number;
  [key: string]: unknown;
}

export interface UsersInfoState {
  [userId: number]: UserInfo;
}

const initialState: UsersInfoState = {};

const userInfo = createSlice({
  name: 'userInfo',
  initialState,
  reducers: {
    setUserInfo: (state, { payload: { user } }: PayloadAction<{ user: UserInfo }>) => {
      state[user.id] = user;
    },
  },
});

const { actions, reducer } = userInfo;

export { actions };

export default reducer;
