import React, { useContext } from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Button, Text } from '@mantine/core';

import i18next from '../../../i18n';
import CustomEventStylesContext from '../../components/CustomEventStylesContext';
import { leaveTournament, joinTournament } from '../../middlewares/Tournament';

interface JoinButtonProps {
  isShow: boolean;
  isParticipant: boolean;
  title?: string;
  teamId?: number;
  disabled?: boolean;
  isShowLeave?: boolean;
}

function JoinButton({
  isShow,
  isParticipant,
  title,
  teamId,
  disabled = false,
  isShowLeave = true,
}: JoinButtonProps) {
  const hasCustomEventStyles = useContext(CustomEventStylesContext);

  const onClick = isParticipant ? leaveTournament : joinTournament;
  const text = isParticipant ? i18next.t('Leave') : i18next.t('Join');
  const actionIcon = isParticipant ? 'user-minus' : 'user-plus';

  if (!isShow || (isParticipant && !isShowLeave)) {
    return null;
  }

  const customClassName = hasCustomEventStyles
    ? isParticipant
      ? 'cb-custom-event-btn-outline-danger'
      : 'cb-custom-event-btn-outline-secondary'
    : undefined;

  return (
    <>
      {title && <Text>{title}</Text>}
      <Button
        type="button"
        onClick={() => {
          onClick(teamId);
        }}
        variant="outline"
        color={isParticipant ? 'red' : 'cbSecondary'}
        radius="md"
        className={customClassName}
        disabled={disabled}
        leftSection={<FontAwesomeIcon icon={actionIcon} />}
      >
        {text}
      </Button>
    </>
  );
}

export default JoinButton;
