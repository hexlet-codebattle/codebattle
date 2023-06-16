import React, { useRef, useLayoutEffect } from 'react';
import { useSelector } from 'react-redux';
import useStayScrolled from 'react-stay-scrolled';
import { activeRoomSelector } from '../selectors';

import Message from './Message';
import { shouldShowMessage } from '../utils/chat';

const Messages = ({ messages, displayMenu = () => {} }) => {
  const activeRoom = useSelector(state => activeRoomSelector(state));

  const filteredMessages = messages.filter(message => shouldShowMessage(message, activeRoom));

  const listRef = useRef();

  const { stayScrolled /* , scrollBottom */ } = useStayScrolled(listRef);
  // Typically you will want to use stayScrolled or scrollBottom inside
  // useLayoutEffect, because it measures and changes DOM attributes (scrollTop) directly
  useLayoutEffect(() => {
    stayScrolled();
  }, [filteredMessages.length, stayScrolled]);

  return (
    <>
      <ul
        ref={listRef}
        className="overflow-auto pt-0 pl-3 pr-2 position-relative cb-messages-list flex-grow-1"
      >
        {filteredMessages.map(message => {
          const {
            id, userId, name, text, type, time, meta,
          } = message;

          return (
            <Message
              name={name}
              userId={userId}
              text={text}
              key={id || `${time}-${name}`}
              type={type}
              time={time}
              meta={meta}
              displayMenu={displayMenu}
            />
          );
        })}
      </ul>
    </>
  );
};

export default Messages;
