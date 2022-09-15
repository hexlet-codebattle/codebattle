import React from 'react';
import { useSelector } from 'react-redux';
import cn from 'classnames';
import moment from 'moment';
import {
  currentUserIsAdminSelector,
  currentUserIdSelector,
} from '../selectors';
import { pushCommand } from '../middlewares/Chat';

const Message = ({
  text = '',
  name = '',
  type,
  time,
  userId,
  handleShowModal,
}) => {
  const currentUserIsAdmin = useSelector(state => currentUserIsAdminSelector(state));

  const currentUserId = useSelector(currentUserIdSelector);

  const inviteBtnClassname = cn('btn btn-sm btn-link create-game-btn', {
    disabled: currentUserId === userId,
  });

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
      {/* eslint-disable-next-line react/no-array-index-key */}
      <a href={`/users/${userId}`}>
        <span className="font-weight-bold">{`${name}: `}</span>
      </a>
      <span className="ml-1">
        {parts.map((part, i) => renderMessagePart(part, i))}
      </span>
      <small className="text-muted text-small ml-auto">
        {time ? moment.unix(time).format('HH:mm:ss') : ''}
      </small>
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
      <button
        type="button"
        className={inviteBtnClassname}
        data-toggle="tooltip"
        data-placement="bottom"
        title="Challenge to a game."
        onClick={handleShowModal}
      >
        <img
          alt="invites"
          src="/assets/images/fight-black.png"
          style={{ width: '1em', height: '1em' }}
        />
      </button>
    </div>
  );
};

export default Message;
