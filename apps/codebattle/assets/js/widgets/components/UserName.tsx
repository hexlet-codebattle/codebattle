import React from 'react';

import { faCircle, faRobot } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';

import LanguageIcon from './LanguageIcon';

export interface UserNameUser {
  id: string | number;
  isBot?: boolean;
  lang?: string;
  name: string;
  rank?: number;
}

export interface UserNameProps {
  className?: string;
  displayName?: string;
  hideLink?: boolean;
  hideOnlineIndicator?: boolean;
  hovered?: boolean;
  isOnline?: boolean;
  lang?: string;
  linkClassName?: string;
  truncate?: boolean;
  user: UserNameUser;
}

function UserName({
  className = '',
  linkClassName = '',
  user,
  lang = user.lang,
  truncate = false,
  isOnline = false,
  hovered = false,
  hideOnlineIndicator = false,
  hideLink = false,
  displayName,
}: UserNameProps) {
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
  const botImgClassName = cn('mr-1 cb-text', {});

  const shownName = displayName || user.name;

  return (
    <div className={cn(commonClassName, className)}>
      {!hideOnlineIndicator && !user.isBot && (
        <FontAwesomeIcon icon={faCircle} className={onlineIndicatorClassName} />
      )}
      {!user.isBot && <LanguageIcon className="mr-1" lang={lang} />}
      {user.isBot && (
        <FontAwesomeIcon className={botImgClassName} icon={faRobot} transform="up-1" />
      )}
      {hideLink ? (
        <span className={userClassName} title={shownName}>
          <span className={userNameClassName}>{shownName}</span>
        </span>
      ) : (
        <a href={`/users/${user.id}`} className={userClassName} title={shownName}>
          <span className={userNameClassName}>{shownName}</span>
        </a>
      )}
    </div>
  );
}

export default UserName;
