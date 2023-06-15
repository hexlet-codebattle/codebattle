import React from 'react';
import moment from 'moment';
import cn from 'classnames';

import UserContextMenu from './UserContextMenu';
import MessageTag from './MessageTag';

const Message = ({
  text = '',
  name = '',
  type,
  time,
  userId,
  meta,
  messageId,
}) => {
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
      <MessageTag messageType={meta?.type} />
      <UserContextMenu
        menuId={`menu-${messageId}`}
        name={name}
        userId={userId}
        isBot={userId < 0}
      >
        <span className="font-weight-bold">{`${name}: `}</span>
      </UserContextMenu>
      <span className={cn(
        'ml-1 text-break', {
          'cb-private-text': meta?.type === 'private',
        },
      )}
      >
        {parts.map((part, i) => renderMessagePart(part, i))}
      </span>
    </div>
  );
};

export default Message;
