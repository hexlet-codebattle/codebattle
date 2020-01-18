import React from 'react';
import _ from 'lodash';
import LanguageIcon from './LanguageIcon';

const UserName = ({
  user: {
    id, githubId, name, rating, lang, ratingDiff,
  },
}) => {
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

export default UserName;
