import React, { useRef, useLayoutEffect } from 'react';
import { useSelector } from 'react-redux';
import useStayScrolled from 'react-stay-scrolled';
import { currentUserIsAdminSelector } from '../selectors';
import { pushCommand } from '../middlewares/Chat';

import Message from './Message';

const Messages = ({ messages = [] }) => {
  const currentUserIsAdmin = useSelector(state => currentUserIsAdminSelector(state));
  const listRef = useRef();
  const { stayScrolled /* , scrollBottom */ } = useStayScrolled(listRef);

  const handleCleanBanned = () => {
    pushCommand({ type: 'clean_banned' });
  };

  // Typically you will want to use stayScrolled or scrollBottom inside
  // useLayoutEffect, because it measures and changes DOM attributes (scrollTop) directly
  useLayoutEffect(() => {
    stayScrolled();
  }, [messages.length, stayScrolled]);

  return (
    <>
      {currentUserIsAdmin ? (
        <button
          type="button"
          className="btn btn-sm btn-link text-danger"
          onClick={() => {
            handleCleanBanned();
          }}
        >
          Clean banned
        </button>
      ) : null}
      <ul
        ref={listRef}
        className="overflow-auto pt-0 pl-3 pr-2 position-relative cb-messages-list"
      >
        {messages.map(({
 id, name, text, type, time, userId,
}) => (
  <Message
    userId={userId}
    name={name}
    text={text}
    key={id || `${time}-${name}`}
    type={type}
    time={time}
  />
        ))}
      </ul>
    </>
  );
};

export default Messages;
