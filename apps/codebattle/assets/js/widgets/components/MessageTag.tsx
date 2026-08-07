import React from 'react';

import { Text } from '@mantine/core';
import { useSelector } from 'react-redux';

import messageTypes from '../config/messageTypes';
import { activeRoomSelector } from '../selectors';
import { isGeneralRoom, isPrivateMessage } from '../utils/chat';

interface MessageTagProps {
  messageType?: string;
}

function MessageTag({ messageType = messageTypes.general }: MessageTagProps) {
  const activeRoom = useSelector(activeRoomSelector);

  if (isGeneralRoom(activeRoom) && isPrivateMessage(messageType)) {
    return (
      <Text component="span" fw={700} mr="xs" className="cb-private-text">
        {`[${messageType}]`}
      </Text>
    );
  }

  return null;
}

export default MessageTag;
