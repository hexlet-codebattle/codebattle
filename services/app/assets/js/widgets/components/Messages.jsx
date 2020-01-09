import React, { useRef, useLayoutEffect } from 'react';
import useStayScrolled from 'react-stay-scrolled';

import Message from './Message';

const Messages = ({ messages = [] }) => {
  const listRef = useRef();
  const { stayScrolled/* , scrollBottom */ } = useStayScrolled(listRef);

  // Typically you will want to use stayScrolled or scrollBottom inside
  // useLayoutEffect, because it measures and changes DOM attributes (scrollTop) directly
  useLayoutEffect(() => {
    stayScrolled();
  }, [messages.length]);

  return (
    <ul
      ref={listRef}
      className="overflow-auto pt-0 pl-4 pr-0 position-relative"
      style={{ wordBreak: 'break-all', height: '80%', top: 5 }}
    >
      {/* eslint-disable-next-line react/no-array-index-key */}
      {messages.map(({ user, message }, i) => <Message user={user} message={message} key={i} />)}
    </ul>
  );
};

export default Messages;
