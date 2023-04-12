import React from 'react';
import { OverlayTrigger, Popover } from 'react-bootstrap';
import { useSelector, useDispatch } from 'react-redux';
import moment from 'moment';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleChevronRight } from '@fortawesome/free-solid-svg-icons';

import {
  currentUserIsAdminSelector,
  currentUserIdSelector,
  lobbyDataSelector,
  secondPlayerSelector,
  activeRoomSelector,
} from '../selectors';
import { pushCommand } from '../middlewares/Chat';
// import { getLobbyUrl } from '../utils/urlBuilders';
import { actions } from '../slices';
import messageTypes from '../config/messageTypes';
import { isGeneralRoomActive, isPrivateMessage } from '../utils/chat';

const getMessagePrefix = (messageType = messageTypes.general, name, room) => {
  if (isGeneralRoomActive(room) && isPrivateMessage(messageType)) {
      return <span className="font-weight-bold">{`[${messageType}] ${name}`}</span>;
  }
  return <span className="font-weight-bold">{`${name}`}</span>;
};

const Message = ({
  text = '',
  name = '',
  type,
  time,
  userId,
  handleShowModal,
  meta,
}) => {
  const dispatch = useDispatch();

  const currentUserIsAdmin = useSelector(state => currentUserIsAdminSelector(state));

  const currentUserId = useSelector(currentUserIdSelector);
  const activeRoom = useSelector(activeRoomSelector);

  const { activeGames } = useSelector(lobbyDataSelector);
  const isCurrentUserHasActiveGames = activeGames.some(({ players }) => players.some(({ id }) => id === currentUserId));
  const isCurrentUserMessage = currentUserId === userId;
  const opponent = useSelector(secondPlayerSelector);
  const isBot = opponent?.isBot && userId === opponent?.id;

  const handleBanClick = bannedName => {
    pushCommand({ type: 'ban', name: bannedName, user_id: userId });
  };

  if (!text) {
    return null;
  }

  if (type === 'info') {
    return (
      <div className="d-flex align-items-baseline flex-wrap">
        <small className="text-muted text-small">{text}</small>
        <small className="text-muted text-small ml-auto">
          {time ? moment.unix(time).format('HH:mm:ss') : ''}
        </small>
      </div>
    );
  }

  const parts = text.split(/(@+[-a-zA-Z0-9_]+\b)/g);

  const renderMessagePart = (part, i) => {
    if (part.slice(1) === name) {
      return (
        <span key={i} className="font-weight-bold bg-warning">
          {part}
        </span>
      );
    }
    if (part.startsWith('@')) {
      return (
        <span key={i} className="font-weight-bold text-primary">
          {part}
        </span>
      );
    }
    return part;
  };

  return (
    <div className="d-flex align-items-baseline flex-wrap">
      {getMessagePrefix(meta?.type, name, activeRoom)}
      <OverlayTrigger
        trigger="focus"
        placement="right"
        overlay={(
          <Popover id="popover-confirm ">
            <div className="d-flex flex-column p-1">
              <button
                type="button"
                className="btn btn-sm btn-link text-danger"
                style={{ width: '100%' }}
                onClick={handleShowModal}
                disabled={isBot || isCurrentUserMessage || isCurrentUserHasActiveGames}
              >
                Send an invite
              </button>
              <button
                type="button"
                className="btn btn-sm btn-link text-danger"
                onClick={() => {
                  const roomData = {
                    id: userId,
                    name,
                  };

                  dispatch(actions.createPrivateRoom(roomData));
                }}
                disabled={isBot || isCurrentUserMessage}
              >
                Direct message
              </button>
              {currentUserIsAdmin ? (
                <button
                  type="button"
                  className="btn btn-sm btn-link text-danger"
                  onClick={() => {
                    handleBanClick(name);
                  }}
                >
                  Ban
                </button>
              ) : null}
            </div>
          </Popover>
        )}
      >
        <button
          type="button"
          data-toggle="tooltip"
          data-placement="bottom"
          className="btn btn-sm"
          title="Actions"
        >
          <FontAwesomeIcon
            icon={faCircleChevronRight}
          />
        </button>
      </OverlayTrigger>
      <span className="ml-1 text-break">
        :
      </span>
      <span className="ml-1 text-break">
        {parts.map((part, i) => renderMessagePart(part, i))}
      </span>
    </div>
  );
};

export default Message;
