import React, { useRef, useLayoutEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import useStayScrolled from 'react-stay-scrolled';
import qs from 'qs';
import { currentUserIsAdminSelector } from '../selectors';
import { pushCommand } from '../middlewares/Chat';
import { actions } from '../slices';

import Message from './Message';
import { getLobbyUrl } from '../utils/urlBuilders';

const Messages = ({ messages = [] }) => {
  const currentUserIsAdmin = useSelector(state => currentUserIsAdminSelector(state));
  const listRef = useRef();
  const dispatch = useDispatch();
  const handleShowModal = (id, name) => () => {
    const queryParamsString = qs.stringify({
      opponent_id: id,
    });
    if (`/${window.location.hash}` !== getLobbyUrl()) {
      window.location.href = getLobbyUrl(queryParamsString);
    } else {
      dispatch(
        actions.showCreateGameInviteModal({ opponentInfo: { id, name } }),
      );
    }
  };

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
          className="btn btn-sm btn-link text-danger align-self-start"
          onClick={() => {
            handleCleanBanned();
          }}
        >
          Clean banned
        </button>
      ) : null}
      <ul
        ref={listRef}
        className="overflow-auto pt-0 pl-3 pr-2 position-relative cb-messages-list flex-grow-1"
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
    handleShowModal={handleShowModal(userId, name)}
  />
        ))}
      </ul>
    </>
  );
};

export default Messages;
