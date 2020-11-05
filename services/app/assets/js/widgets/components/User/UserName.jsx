import React from 'react';
import _ from 'lodash';
import { useSelector, useDispatch } from 'react-redux';
import i18n from '../../../i18n';
import LanguageIcon from '../LanguageIcon';
import { loadUser } from '../../middlewares/Users';
import { usersInfoSelector, currentUserIdSelector } from '../../selectors';

const isValidUserInfo = user => (
  Boolean(user.id === 0 || user.rating)
);

const getName = ({ id, name }, isCurrentUser) => {
  if (id < 0) {
    return i18n.t('%{name}(bot)', { name });
  }

  return isCurrentUser ? i18n.t('%{name}(you)', { name }) : name;
};

const displayDiff = num => {
  if (num < 0) {
    return <small className="text-danger">{` ${num}`}</small>;
  }
  return <small className="text-success">{` +${num}`}</small>;
};

const UserName = ({ user }) => {
  const users = useSelector(usersInfoSelector);
  const isCurrentUser = useSelector(state => currentUserIdSelector(state) === user.id);
  const dispatch = useDispatch();

  const userInfo = isValidUserInfo(user) ? user : users[user.id];

  if (!userInfo) {
    dispatch(loadUser)({ id: user.id });
    return null;
  }

  const {
    id, lang, rating, ratingDiff,
  } = userInfo;

  const anonymousUser = (
    <span className="text-secondary">
      {getName(userInfo, isCurrentUser)}
    </span>
  );
  const loggedUser = (
    <span className="d-flex align-items-center">
      <a
        href={`/users/${id}`}
        key={id}
        className="d-flex align-items-center mr-1 text-truncate"
      >
        <span className="text-truncate">{getName(userInfo, isCurrentUser)}</span>
      </a>
      <LanguageIcon lang={lang} />
    </span>
  );

  return (
    <div
      className="d-inline align-middle"
    >
      {id === 0 ? anonymousUser : loggedUser}
    </div>
  );
};

export default UserName;
