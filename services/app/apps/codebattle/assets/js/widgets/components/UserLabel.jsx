import React, { useMemo } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';
import { useSelector } from 'react-redux';

import * as selectors from '../selectors';

function UserLabel({ user }) {
  const { presenceList } = useSelector(selectors.lobbyDataSelector);

  const isOnline = useMemo(
    () => presenceList.some(({ id }) => id === user.id),
    [presenceList, user.id],
  );
  const onlineIndicatorClassName = cn('mr-1', {
    'cb-user-online': isOnline,
    'cb-user-offline': !isOnline,
  });

  return (
    <>
      <span className="text-truncate">
        <FontAwesomeIcon
          icon={['fa', 'circle']}
          className={onlineIndicatorClassName}
        />
        <span>{user.name}</span>
      </span>
    </>
  );
}

export default UserLabel;
