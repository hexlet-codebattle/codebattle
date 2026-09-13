import React, { useMemo } from 'react';

import { type IconProp } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Group, Text } from '@mantine/core';
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
  const onlineIndicatorClassName = cn({
    'cb-user-online': isOnline,
    'cb-user-dark-offline': !isOnline,
  });

  return (
    <Group component="span" display="inline-flex" gap="xs" wrap="nowrap">
      <FontAwesomeIcon
        icon={['fa', 'circle'] as unknown as IconProp}
        className={onlineIndicatorClassName}
      />
      <Text component="span" truncate>
        {user.name}
      </Text>
    </Group>
  );
}

export default UserLabel;
