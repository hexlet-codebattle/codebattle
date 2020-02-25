import React from 'react';
import _ from 'lodash';
import { connect } from 'react-redux';
import LanguageIcon from './LanguageIcon';
import { loadUser } from '../middlewares/Users';
import { getUsersInfo } from '../selectors';

const isValidUserInfo = user => (
  Boolean(user.githubId && user.rating && user.ratingDiff && user.lang)
);

const UserName = ({ user, users, dispatch }) => {
  const userInfo = isValidUserInfo(user) ? user : users[user.id];

  if (!userInfo) {
    dispatch(loadUser)({ id: user.id });
    return null;
  }

  const {
    id, name, githubId, lang, rating, ratingDiff,
  } = userInfo;

  const anonymousUser = (
    <span className="text-secondary">
      <span className="border rounded align-middle text-center p-1 mr-1">
        <i className="fa fa-lg fa-user-secret" aria-hidden="true" />
      </span>
      {name}
    </span>
  );

  const displayDiff = num => {
    if (num < 0) {
      return <small className="text-danger">{` ${num}`}</small>;
    }
    return <small className="text-success">{` +${num}`}</small>;
  };
  const githubUser = (
    <span className="d-flex align-items-center">
      <a
        href={`/users/${id}`}
        key={githubId}
        className="d-flex align-items-center mr-1"
      >
        <img
          className="attachment rounded border mr-1"
          alt={name}
          src={`https://avatars0.githubusercontent.com/u/${githubId}`}
          style={{ width: '25px' }}
        />
        <span>{name}</span>
      </a>
      <LanguageIcon lang={lang} />
      <small>
        {_.isFinite(rating) && rating}
      </small>
      {ratingDiff ? displayDiff(ratingDiff) : ''}
    </span>
  );

  return (
    <div
      style={{ whiteSpace: 'nowrap' }}
      className="d-inline align-middle"
    >
      {id === 'anonymous' ? anonymousUser : githubUser}
    </div>
  );
};

const mapStateToProps = state => ({
  users: getUsersInfo(state),
});

export default connect(mapStateToProps)(UserName);
