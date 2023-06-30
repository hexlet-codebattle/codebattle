import React from 'react';
import { useSelector } from 'react-redux';

import { activeRoomSelector } from '../selectors';
import messageTypes from '../config/messageTypes';
import { isGeneralRoom, isPrivateMessage } from '../utils/chat';

const MessageTag = ({ messageType = messageTypes.general }) => {
  const activeRoom = useSelector(activeRoomSelector);

  if (isGeneralRoom(activeRoom) && isPrivateMessage(messageType)) {
    return <span className="font-weight-bold mr-1 cb-private-text">{`[${messageType}]`}</span>;
  }
  return null;
};

export default MessageTag;
