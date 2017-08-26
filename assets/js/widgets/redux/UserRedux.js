import _ from 'lodash';
import Immutable from 'seamless-immutable';
import { createReducer } from 'reduxsauce';
import userTypes from '../config/userTypes';


/* ------------- Initial State ------------- */

export const INITIAL_STATE = Immutable({
  currentUserId: null,
  users: {
    1: { id: 1, type: userTypes.firstPlayer },
    2: { id: 2, type: userTypes.secondPlayer },
  },
});

/* ------------- Reducers ------------- */

// export const usersSuccess = (state, { entities: { users } }) => {
//   if (users) {
// return state.merge({ fetching: false, error: null, users }, { deep: true })
//   }
//   return state
// }

/* ------------- Hookup Reducers To Types ------------- */
export const reducer = createReducer(INITIAL_STATE, { });

/* ------------- Selectors ------------- */

export const usersSelector = state => state.users.users;
export const currentUserIdSelector = state => state.users.currentUserId;
export const currentUserSelector = state =>
  _.pick(
    usersSelector(state),
    [currentUserIdSelector(state)],
  );

export const firstUserSelector = (state) => {
  const user = _.pickBy(usersSelector(state), { type: userTypes.firstPlayer });
  return _.values(user)[0];
};

export const secondUserSelector = (state) => {
  const user = _.pickBy(usersSelector(state), { type: userTypes.secondPlayer });
  return _.values(user)[0];
};

