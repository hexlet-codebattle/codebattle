import React, { useMemo } from 'react';

import { type IconProp } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';
import { useSelector } from 'react-redux';

import * as selectors from '../selectors';

import { type UserNameUser } from './UserName';

interface UserLabelProps {
  user: UserNameUser;
}

function UserLabel({ user }: UserLabelProps) {
  const { presenceList } = useSelector(selectors.lobbyDataSelector);

  const isOnline = useMemo(
    () => presenceList.some((item) => (item as { id: string | number }).id === user.id),
    [presenceList, user.id],
  );
  const onlineIndicatorClassName = cn('mr-1', {
    'cb-user-online': isOnline,
    'cb-user-dark-offline': !isOnline,
  });

  return (
    <span className="text-truncate">
      <FontAwesomeIcon
        icon={['fa', 'circle'] as unknown as IconProp}
        className={onlineIndicatorClassName}
      />
      <span>{user.name}</span>
    </span>
  );
}

export default UserLabel;
