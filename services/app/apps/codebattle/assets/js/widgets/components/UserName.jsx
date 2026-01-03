import React from 'react';

import { faCircle, faRobot } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';

import LanguageIcon from './LanguageIcon';

function UserName({
  className = '', linkClassName = '', user, lang = user.lang, truncate, isOnline, hovered, hideOnlineIndicator, hideLink, hideRank,
}) {
  const commonClassName = 'd-flex align-items-center';
  const onlineIndicatorClassName = cn('mr-1', {
    'cb-user-online': isOnline,
    'cb-user-dark-offline': !isOnline,
  });
  const userClassName = cn('text-truncate', {
    'x-username-truncated': truncate,
  });
  const userNameClassName = cn(linkClassName, {
    'text-primary': hovered,
  });
  const botImgClassName = cn('mr-1 cb-text', {
  });

  return (
    <div className={cn(commonClassName, className)}>
      {(!hideOnlineIndicator && !user.isBot) && <FontAwesomeIcon icon={faCircle} className={onlineIndicatorClassName} />}
      <LanguageIcon className="mr-1" lang={lang} />
      {user.isBot && <FontAwesomeIcon className={botImgClassName} icon={faRobot} transform="up-1" />}
      {hideLink ? (
        <span className={userClassName}>
          <span className={userNameClassName}>{user.name}</span>
          {user.rank && !hideRank && <span className={userNameClassName}>{`(${user.rank})`}</span>}
        </span>
      ) : (
        <a href={`/users/${user.id}`} className={userClassName}>
          <span className={userNameClassName}>{user.name}</span>
          {user.rank && !hideRank && <span className={userNameClassName}>{`(${user.rank})`}</span>}
        </a>
      )}
    </div>
  );
}

export default UserName;
