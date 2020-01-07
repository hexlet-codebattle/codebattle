import _ from 'lodash';
import { createReducer } from '@reduxjs/toolkit';
import * as actions from '../actions';

export const initState = {
  currentUserId: null,
  users: {},
  usersStats: {},
};

const reducer = createReducer(initState, {
  [actions.setCurrentUser](state, { payload }) {
    const { user } = payload;
    const currentUserId = user.id;
    if (currentUserId) {
      state.currentUserId = currentUserId;
      state.users[user.id] = user;
    }
  },

  [actions.updateUsers](state, { payload }) {
    const { users: usersList } = payload;
    const users = _.reduce(usersList, (acc, user) => ({ ...acc, [user.id]: user }), {});
    if (!_.isEmpty(users)) {
      Object.assign(state.users, users);
    }
  },

  [actions.updateUsersStats](state, { payload }) {
    const { userId, stats, achievements } = payload;
    state.usersStats[userId] = { stats, achievements };
  },

  [actions.updateUsersRatingPage](state, { payload }) {
    const { users, pageInfo } = payload;
    state.usersRatingPage = { users, pageInfo };
  },
});


export default reducer;
