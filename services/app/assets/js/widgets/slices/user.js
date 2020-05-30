import _ from 'lodash';
import { createSlice } from '@reduxjs/toolkit';

export const initialState = {
  currentUserId: null,
  users: {},
  usersStats: {},
  usersRatingPage: {
    users: [],
    pageInfo: { totalEntries: 0 },
  },
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setCurrentUser: (state, { payload }) => {
      const { user } = payload;
      const currentUserId = user.id;
      if (currentUserId || currentUserId === 0) {
        state.currentUserId = currentUserId;
        state.users[user.id] = user;
      }
    },
    updateUsers: (state, { payload }) => {
      const { users: usersList } = payload;
      const users = _.reduce(
        usersList,
        (acc, user) => ({ ...acc, [user.id]: user }),
        {},
      );
      if (!_.isEmpty(users)) {
        Object.assign(state.users, users);
      }
    },
    updateUsersStats: (state, { payload }) => {
      const { userId, stats, achievements } = payload;
      state.usersStats[userId] = { stats, achievements };
    },
    updateUsersRatingPage: (state, { payload }) => {
      const { users, pageInfo } = payload;
      state.usersRatingPage = { users, pageInfo };
    },
  },
});

const { actions, reducer } = userSlice;

export { actions };

export default reducer;
