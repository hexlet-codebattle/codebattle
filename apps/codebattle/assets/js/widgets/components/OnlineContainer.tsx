import React from 'react';

import { Text } from '@mantine/core';
import { useSelector } from 'react-redux';

import i18n from '../../i18n';
import * as selectors from '../selectors';

function OnlineContainer() {
  const { presenceList } = useSelector(selectors.lobbyDataSelector);
  const count = presenceList ? presenceList.length : 0;

  if (count === 0) return <></>;

  return (
    <Text component="span" c="dimmed" mr="sm">
      {i18n.t('%{count} Online', { count })}
    </Text>
  );
}

export default OnlineContainer;
