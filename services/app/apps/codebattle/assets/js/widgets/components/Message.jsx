import React from 'react';
import moment from 'moment';
import cn from 'classnames';

import MessageTag from './MessageTag';

const Message = ({
  text = '',
  name = '',
  userId,
  type,
  time,
  meta,
  displayMenu,
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
      <span
        role="button"
        tabIndex={0}
        className="font-weight-bold"
        data-user-id={userId}
        onContextMenu={displayMenu}
        onClick={displayMenu}
        onKeyPress={displayMenu}
      >
        {`${name}: `}
      </span>
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
