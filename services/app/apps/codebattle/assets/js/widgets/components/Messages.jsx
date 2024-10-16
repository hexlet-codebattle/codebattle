import React, { useRef, useLayoutEffect } from 'react';

// import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import useStayScrolled from '../utils/useStayScrolled';

import Message from './Message';

const getKey = (id, time, name) => {
  if (!time || !name) {
    return id;
  }

  return `${id}-${time}-${name}`;
};

function Messages({ messages, displayMenu = () => {}, disabled = false }) {
  const listRef = useRef();

  const { /*stayScrolled  ,*/ scrollBottom  } = useStayScrolled(listRef);
  // Typically you will want to use stayScrolled or scrollBottom inside
  // useLayoutEffect, because it measures and changes DOM attributes (scrollTop) directly
  useLayoutEffect(() => {
    scrollBottom();
  }, [messages.length, scrollBottom]);

  if (disabled) {
    return (
      <div title="Chat is disabled" className="h-100 position-relative" ref={listRef}>
        {/* <span className="d-flex text-muted position-absolute h-100 w-100 justify-content-center align-items-center"> */}
        {/*   <FontAwesomeIcon className="h-25 w-25" icon="comment-slash" /> */}
        {/* </span> */}
        {/* <div className="position-absolute h-100 w-100 bg-dark cb-opacity-50 rounded-left" /> */}
      </div>
    );
  }

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

          const key = getKey(id, time, name);

          return (
            <Message
              name={name}
              userId={userId}
              text={text}
              key={key}
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
}

export default Messages;
