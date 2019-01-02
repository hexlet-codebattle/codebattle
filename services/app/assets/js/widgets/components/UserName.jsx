import React from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';

const UserName = ({ user }) => {
  const ratingStr = _.isFinite(user.rating) ? ` (${user.rating})` : '';

  return (
    <div
      style={{ whiteSpace: 'nowrap' }}
      className="d-inline align-middle"
    >
      <a
        href={`/users/${user.id}`}
        key={user.github_id}
      >
        <img
          className="attachment rounded border mr-1"
          alt={user.name}
          src={`https://avatars0.githubusercontent.com/u/${user.github_id}`}
          style={{ width: '25px' }}
        />
        {user.name + ratingStr}
      </a>
    </div>
  );
};

UserName.propTypes = {
  user: PropTypes.object.isRequired,
};

export default UserName;
