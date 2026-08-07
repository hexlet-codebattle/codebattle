import React from 'react';

import { Button, Group } from '@mantine/core';
import { useSelector } from 'react-redux';

import i18n from '../../i18n';
import { pushCommand, pushCommandTypes } from '../middlewares/Chat';
import * as selectors from '../selectors';

import Rooms from './Rooms';

interface ChatHeaderProps {
  disabled?: boolean;
  showRooms?: boolean;
}

export default function ChatHeader({ showRooms = false, disabled = false }: ChatHeaderProps) {
  const currentUserIsAdmin = useSelector(selectors.currentUserIsAdminSelector);

  const handleCleanBanned = () => {
    pushCommand({ type: pushCommandTypes.cleanBanned });
  };

  const showBorder = showRooms || (currentUserIsAdmin && !disabled);

  return (
    <Group
      align="center"
      gap="xs"
      style={
        showBorder ? { borderBottom: '1px solid var(--mantine-color-default-border)' } : undefined
      }
    >
      {showRooms && !disabled && <Rooms disabled={disabled} />}
      {currentUserIsAdmin && !disabled && (
        <Button
          variant="subtle"
          color="red"
          size="xs"
          radius="md"
          onClick={handleCleanBanned}
          disabled={disabled}
        >
          {i18n.t('Clean banned')}
        </Button>
      )}
    </Group>
  );
}
