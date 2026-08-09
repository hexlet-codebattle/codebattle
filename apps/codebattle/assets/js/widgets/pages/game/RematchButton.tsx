import React from 'react';

import { faCheck, faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button, Group, Text } from '@mantine/core';
import { connect } from 'react-redux';

import { type RootState } from '@/slices';

import i18n from '../../../i18n';
import {
  sendOfferToRematch,
  sendRejectToRematch,
  sendAcceptToRematch,
} from '../../middlewares/Room';
import * as selectors from '../../selectors';

const getPlayerStatus = (rematchInitiatorId: number | null, currentUserId: number | null) => {
  if (rematchInitiatorId === null) {
    return null;
  }
  return rematchInitiatorId === currentUserId ? 'initiator' : 'acceptor';
};

interface RematchButtonProps {
  gameStatus: {
    rematchState: string | null;
    rematchInitiatorId: number | null;
  };
  currentUserId: number | null;
  isOpponentInGame: boolean;
  disabled?: boolean;
}

const RematchButton = ({
  gameStatus: { rematchState, rematchInitiatorId },
  currentUserId,
  isOpponentInGame,
  disabled,
}: RematchButtonProps) => {
  const renderBtnAfterReject = () => (
    <Button color="red" fullWidth disabled={disabled}>
      {i18n.t('Rejected Offer')}
    </Button>
  );

  const renderBtnAfterSendOffer = () => {
    const text = isOpponentInGame ? 'Wait For An Answer...' : 'Opponent Left The Game';
    return (
      <Button color={isOpponentInGame ? 'cbSecondary' : 'yellow'} fullWidth disabled>
        {i18n.t(text)}
      </Button>
    );
  };

  const renderBtnAfterRecieveOffer = () => (
    <Group wrap="nowrap" mb="md" w="100%">
      <Text flex={1} style={{ border: '1px solid' }} py="xs" px="sm" ta="center">
        {i18n.t('Rematch?')}
      </Text>
      <Group gap="xs" wrap="nowrap">
        <Button
          variant="outline"
          color="cbSecondary"
          onClick={sendAcceptToRematch}
          title={i18n.t('Accept')}
          aria-label={i18n.t('Accept')}
        >
          <FontAwesomeIcon icon={faCheck} />
        </Button>
        <Button
          variant="outline"
          color="cbSecondary"
          onClick={sendRejectToRematch}
          title={i18n.t('Decline')}
          aria-label={i18n.t('Decline')}
        >
          <FontAwesomeIcon icon={faXmark} />
        </Button>
      </Group>
    </Group>
  );

  const renderBtnByDefault = () => (
    <Button
      color="cbSecondary"
      radius="md"
      fullWidth
      onClick={sendOfferToRematch}
      disabled={disabled}
    >
      {disabled ? i18n.t('Opponent has left') : i18n.t('Rematch')}
    </Button>
  );

  const mapRematchStateToButtons: Record<string, React.ReactNode> = {
    in_approval_initiator: renderBtnAfterSendOffer(),
    in_approval_acceptor: renderBtnAfterRecieveOffer(),
    rejected_initiator: renderBtnAfterReject(),
    rejected_acceptor: renderBtnAfterReject(),
    none: renderBtnByDefault(),
  };

  const playerStatus = getPlayerStatus(rematchInitiatorId, currentUserId);

  return (
    mapRematchStateToButtons[`${rematchState}_${playerStatus}`] || mapRematchStateToButtons.none
  );
};

const mapStateToProps = (state: RootState) => {
  const currentUserId = selectors.currentUserIdSelector(state);

  return {
    gameTask: selectors.gameTaskSelector(state),
    gameStatus: selectors.gameStatusSelector(state),
    currentUserId,
    isOpponentInGame: selectors.isOpponentInGameSelector(state),
  };
};

export default connect(mapStateToProps)(RematchButton);
