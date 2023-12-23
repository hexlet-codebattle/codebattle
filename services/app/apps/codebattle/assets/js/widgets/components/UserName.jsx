import React from 'react';

import { faCircle, faRobot } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';

import LanguageIcon from './LanguageIcon';

const UserName = ({
  className = '', user, truncate, isOnline, hideOnlineIndicator,
}) => {
  const commonClassName = 'd-flex align-items-center';
  const onlineIndicatorClassName = cn('mr-1', {
    'cb-user-online': isOnline,
    'cb-user-offline': !isOnline,
  });
  const userLinkClassName = cn('text-truncate', {
    'text-danger': user.isAdmin,
    'x-username-truncated': truncate,
  });

  const userName = user.rank ? `${user.name}(${user.rank})` : user.name;

  return (
    <div className={cn(commonClassName, className)}>
      {(!hideOnlineIndicator && !user.isBot) && <FontAwesomeIcon icon={faCircle} className={onlineIndicatorClassName} />}
      <LanguageIcon className="mr-1" lang={user.lang} />
      {user.isBot && <FontAwesomeIcon className="mr-1" icon={faRobot} transform="up-1" />}
      <a href={`/users/${user.id}`} className={userLinkClassName}>{userName}</a>
    </div>
  );
};

export default UserName;
