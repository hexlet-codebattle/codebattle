import React from 'react';

import cn from 'classnames';
import moment from 'moment';

import MessageTag from './MessageTag';

function Message({ displayMenu, meta, name = '', text = '', time, type, userId }) {
  if (!text) {
    return null;
  }

  if (type === 'system') {
    const statusClassName = cn('text-small', {
      'text-danger': ['error', 'failure'].includes(meta?.status),
      'text-success': meta?.status === 'success',
      'text-muted': meta?.status === 'event',
    });

    return (
      <div className="d-flex align-items-baseline flex-wrap">
        <small className={statusClassName}>{text}</small>
      </div>
    );
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
      <span
        data-user-id={userId}
        data-user-name={name}
        role="button"
        tabIndex={0}
        title={`Message (${name})`}
        onClick={displayMenu}
        onContextMenu={displayMenu}
        onKeyPress={displayMenu}
      >
        <MessageTag messageType={meta?.type} />
        <span className="font-weight-bold">{`${name}: `}</span>
      </span>
      <span
        className={cn('ml-1 text-break', {
          'cb-private-text': meta?.type === 'private',
        })}
      >
        {parts.map((part, i) => renderMessagePart(part, i))}
      </span>
    </div>
  );
}

export default Message;
