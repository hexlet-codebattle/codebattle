import React from 'react';

import { faCircle, faRobot } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Group, Text } from '@mantine/core';
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
  const onlineIndicatorClassName = cn({
    'cb-user-online': isOnline,
    'cb-user-dark-offline': !isOnline,
  });

  const shownName = displayName || user.name;

  const nameContent = (
    <Text component="span" className={linkClassName} c={hovered ? 'blue' : undefined}>
      {shownName}
    </Text>
  );

  return (
    <Group gap="xs" wrap="nowrap" className={className}>
      {!hideOnlineIndicator && !user.isBot && (
        <FontAwesomeIcon icon={faCircle} className={onlineIndicatorClassName} />
      )}
      {!user.isBot && <LanguageIcon lang={lang} />}
      {user.isBot && <FontAwesomeIcon className="cb-text" icon={faRobot} transform="up-1" />}
      {hideLink ? (
        <Text
          component="span"
          truncate
          title={shownName}
          className={cn({ 'x-username-truncated': truncate })}
        >
          {nameContent}
        </Text>
      ) : (
        <Text
          component="a"
          href={`/users/${user.id}`}
          truncate
          title={shownName}
          className={cn({ 'x-username-truncated': truncate })}
        >
          {nameContent}
        </Text>
      )}
    </Group>
  );
}

export default UserName;
