import React, { useContext, memo } from 'react';

import { Box } from '@mantine/core';

import i18n from 'i18next';

import RoomContext from '../../components/RoomContext';
import { isDisconnectedWithMessageSelector } from '../../machines/selectors';
import useMachineStateSelector from '../../utils/useMachineStateSelector';

function NetworkAlert() {
  const { mainService } = useContext(RoomContext);
  const isDisconnectedWithMessage = useMachineStateSelector(
    mainService,
    isDisconnectedWithMessageSelector,
  );

  if (isDisconnectedWithMessage) {
    return (
      <Box mx={4} ta="center">
        <Box style={{ backgroundColor: '#ffc107' }}>
          {i18n.t('Connection lost, please reload the page')}
        </Box>
      </Box>
    );
  }

  return <></>;
}

export default memo(NetworkAlert);
