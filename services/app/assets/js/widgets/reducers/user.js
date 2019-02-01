import _ from 'lodash';
import { handleActions } from 'redux-actions';
import * as actions from '../actions';

export const initState = {
  currentUserId: null,
  users: {},
  usersStats: {}
};

const reducer = handleActions({
  [actions.setCurrentUser](state, { payload }) {
    const { user } = payload;
    const currentUserId = user.id;
    if (currentUserId) {
      return {
        ...state,
        users: {
          ...state.users,
          [user.id]: user,
        },
        currentUserId,
      };
    }
    return state;
  },

  [actions.updateUsers](state, { payload }) {
    const { users: usersList } = payload;
    const users = _.reduce(usersList, (acc, user) => ({ ...acc, [user.id]: user }), {});
    if (!_.isEmpty(users)) {
      return { ...state, users: { ...state.users, ...users } };
    }
    return state;
  },

  [actions.updateUsersStats](state, {payload}) {
    const {userId, stats} = payload;

    return {
      ...state,
      usersStats: {
        ...state.usersStats,
        [userId]: stats
      }
    };
  },
}, initState);

export default reducer;
