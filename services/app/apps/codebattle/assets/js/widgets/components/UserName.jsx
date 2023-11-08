import React from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';

import LanguageIcon from './LanguageIcon';

const renderUserName = ({ name, rank }) => {
  const displayRank = rank ? `(${rank})` : '';

  return `${name}${displayRank}`;
};
const renderOnlineIndicator = (user, isOnline) => {
  if (user.id <= 0) {
    return null;
  }

  const onlineIndicatorClassName = cn('mr-2', {
    'cb-user-online': isOnline,
    'cb-user-offline': !isOnline,
  });

  return (
    <span>
      <FontAwesomeIcon
        icon={['fa', 'circle']}
        className={onlineIndicatorClassName}
      />
    </span>
  );
};

const UserName = ({
  user, truncate, isOnline, hideOnlineIndicator,
}) => (
  <div className="d-flex align-items-center">
    {!hideOnlineIndicator && renderOnlineIndicator(user, isOnline)}
    <LanguageIcon lang={user.lang || 'js'} />
    {user.id < 0 && <FontAwesomeIcon className="mx-1 mb-1" icon="robot" />}
    <a
      href={`/users/${user.id}`}
      key={user.id}
      className={cn('d-flex align-items-center', {
        'text-danger': user.isAdmin,
      })}
    >
      <p
        className={cn('text-truncate m-0', {
          'x-username-truncated': truncate,
        })}
      >
        <u className="text-decoration-none">{renderUserName(user)}</u>
      </p>
    </a>
  </div>
);

export default UserName;
