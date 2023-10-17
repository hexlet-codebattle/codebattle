import React from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';

import i18n from '../../i18n';

import LanguageIcon from './LanguageIcon';

const renderUserName = ({ id, name, rank }) => {
  if (id < 0) {
    return i18n.t('%{name}(bot)', { name });
  }

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
  <div className="d-flex align-items-baseline">
    {!hideOnlineIndicator && renderOnlineIndicator(user, isOnline)}
    <span className="d-flex align-items-center">
      <LanguageIcon lang={user.lang || 'js'} />
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
          <u>{renderUserName(user)}</u>
        </p>
      </a>
    </span>
  </div>
  );

export default UserName;
