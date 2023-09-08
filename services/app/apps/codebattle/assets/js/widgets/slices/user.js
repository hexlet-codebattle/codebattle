import { createSlice } from '@reduxjs/toolkit';
import isEmpty from 'lodash/isEmpty';

import initial from './initial';

const userSlice = createSlice({
  name: 'user',
  initialState: initial.user,
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
      const users = usersList.reduce((acc, user) => ({ ...acc, [user.id]: user }), {});
      if (!isEmpty(users)) {
        Object.assign(state.users, users);
      }
    },
    updateUsersStats: (state, { payload }) => {
      const { achievements, stats, userId } = payload;
      state.usersStats[userId] = { stats, achievements };
    },
    updateUsersRatingPage: (state, { payload }) => {
      const { dateFrom, pageInfo, users, withBots } = payload;
      state.usersRatingPage = {
        users,
        pageInfo,
        dateFrom,
        withBots: withBots === 'true',
      };
    },
  },
});

const { actions, reducer } = userSlice;

export { actions };

export default reducer;
