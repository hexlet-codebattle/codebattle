import _ from 'lodash';
import userTypes from '../config/userTypes';

export const usersSelector = state => state.user.users;
export const currentUserIdSelector = state => state.user.currentUserId;

export const currentUserSelector = (state) => {
  const user = _.pick(
    usersSelector(state),
    [currentUserIdSelector(state)],
  );
  if (!_.isEmpty(user)) {
    return _.values(user)[0];
  }

  return null;
};

export const firstUserSelector = (state) => {
  const user = _.pickBy(usersSelector(state), { type: userTypes.firstPlayer });
  if (!_.isEmpty(user)) {
    return _.values(user)[0];
  }

  return {};
};

export const secondUserSelector = (state) => {
  const user = _.pickBy(usersSelector(state), { type: userTypes.secondPlayer });
  if (!_.isEmpty(user)) {
    return _.values(user)[0];
  }

  return {};
};
