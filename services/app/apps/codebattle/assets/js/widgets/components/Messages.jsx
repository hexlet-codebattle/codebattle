import React, { useRef, useLayoutEffect } from 'react';
import useStayScrolled from 'react-stay-scrolled';

import Message from './Message';

const Messages = ({ messages, displayMenu = () => {} }) => {
  const listRef = useRef();

  const { stayScrolled /* , scrollBottom */ } = useStayScrolled(listRef);
  // Typically you will want to use stayScrolled or scrollBottom inside
  // useLayoutEffect, because it measures and changes DOM attributes (scrollTop) directly
  useLayoutEffect(() => {
    stayScrolled();
  }, [messages.length, stayScrolled]);

  return (
    <>
      <ul
        ref={listRef}
        className="overflow-auto pt-0 pl-3 pr-2 position-relative cb-messages-list flex-grow-1"
      >
        {messages.map(message => {
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
