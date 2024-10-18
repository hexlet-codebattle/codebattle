import React from 'react';

import { faCircle, faRobot } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';

import LanguageIcon from './LanguageIcon';

const UserName = ({
  className = '', user, lang = user.lang, truncate, isOnline, hovered, hideOnlineIndicator, hideLink,
}) => {
  const commonClassName = 'd-flex align-items-center';
  const onlineIndicatorClassName = cn('mr-1', {
    'cb-user-online': isOnline,
    'cb-user-offline': !isOnline,
  });
  const userClassName = cn('text-truncate', {
    'x-username-truncated': truncate,
  });
  const userNameClassName = cn({
    'text-primary': hovered,
  });

  return (
    <div className={cn(commonClassName, className)}>
      {(!hideOnlineIndicator && !user.isBot) && <FontAwesomeIcon icon={faCircle} className={onlineIndicatorClassName} />}
      <LanguageIcon className="mr-1" lang={lang} />
      {user.isBot && <FontAwesomeIcon className="mr-1" icon={faRobot} transform="up-1" />}
      {hideLink ? (
        <span className={userClassName}>
          <span className={userNameClassName}>{user.name}</span>
          {user.rank && <span>{`(${user.rank})`}</span>}
        </span>
      ) : (
        <a href={`/users/${user.id}`} className={userClassName}>
          <span className={userNameClassName}>{user.name}</span>
          {user.rank && <span>{`(${user.rank})`}</span>}
        </a>
      )}
    </div>
  );
};

export default UserName;
