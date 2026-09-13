import React, { memo, useEffect } from 'react';

import NiceModal, { unregister } from '@ebay/nice-modal-react';
import cn from 'classnames';
import { useSelector } from 'react-redux';

import { Box, Flex } from '@mantine/core';

import Loading from '../../components/Loading';
import loadingStatuses from '../../config/loadingStatuses';
import ModalCodes from '../../config/modalCodes';
import { eventSelector } from '../../selectors';
import TournamentDescriptionModal from '../tournament/TournamentDescriptionModal';

import ParticipantDashboard from './ParticipantDashboard';

const useEventWidgetModals = () => {
  useEffect(() => {
    NiceModal.register(ModalCodes.tournamentDescriptionModal, TournamentDescriptionModal);

    const unregisterModals = () => {
      unregister(ModalCodes.tournamentDescriptionModal);
    };

    return unregisterModals;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};

function EventWidget() {
  useEventWidgetModals();

  const { loading } = useSelector(eventSelector) ?? {};

  const isLoading = loading === loadingStatuses.LOADING;

  return (
    <Box pos="relative" w="100%" px="md">
      <Box className={cn({ 'cb-opacity-50': isLoading })}>
        <ParticipantDashboard />
      </Box>
      {isLoading && (
        <Flex justify="center" align="center" pos="absolute" w="100%">
          <Loading large />
        </Flex>
      )}
    </Box>
  );
}

export default memo(EventWidget);
