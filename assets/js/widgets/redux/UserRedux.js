import _ from 'lodash';
import Immutable from 'seamless-immutable';
import { createReducer } from 'reduxsauce';
import userTypes from '../config/userTypes';
import { UserTypes as Types } from './Actions';

/* ------------- Initial State ------------- */

export const INITIAL_STATE = Immutable({
  currentUserId: null,
  users: {
    1: { id: 1, type: userTypes.firstPlayer },
    2: { id: 2, type: userTypes.secondPlayer },
  },
});

/* ------------- Reducers ------------- */

export const setCurrentUser = (state, { currentUserId }) => {
  if (currentUserId) {
    return state.merge({ currentUserId });
  }
  return state;
}

export const updateUsers = (state, { users: usersList }) => {
  const users = _.reduce(usersList, user => ({ [user.id]: user }), {})
  if (!_.isEmpty(users)) {
    return state.updateIn(['users'], Immutable.merge, users);
  }
  return state;
}

/* ------------- Hookup Reducers To Types ------------- */
export const reducer = createReducer(INITIAL_STATE, {
  [Types.SET_CURRENT_USER]: setCurrentUser,
  [Types.UPDATE_USERS]: updateUsers,
});

/* ------------- Selectors ------------- */

export const usersSelector = state => state.users.users;
export const currentUserIdSelector = state => state.users.currentUserId;
export const currentUserSelector = (state) => {
  const user = _.pick(
    usersSelector(state),
    [currentUserIdSelector(state)],
  );
  return _.values(user)[0];
};

export const firstUserSelector = (state) => {
  const user = _.pickBy(usersSelector(state), { type: userTypes.firstPlayer });
  return _.values(user)[0];
};

export const secondUserSelector = (state) => {
  const user = _.pickBy(usersSelector(state), { type: userTypes.secondPlayer });
  return _.values(user)[0];
};

