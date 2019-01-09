import React from 'react';
import _ from 'lodash';
import LanguageIcon from './LanguageIcon';

const UserName = ({
  user: {
    id, github_id: githubId, name, rating, lang,
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

  const githubUser = (
    <a
      href={`/users/${id}`}
      key={githubId}
    >
      <img
        className="attachment rounded border mr-1"
        alt={name}
        src={`https://avatars0.githubusercontent.com/u/${githubId}`}
        style={{ width: '25px' }}
      />
      <span className="mr-1">{name}</span>
      <LanguageIcon lang={lang} />
      <small>
        {_.isFinite(rating) && rating}
      </small>
    </a>
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
