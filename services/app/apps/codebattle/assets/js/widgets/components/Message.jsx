import React from 'react';

import cn from 'classnames';
import moment from 'moment';

import MessageTag from './MessageTag';
import MessageTimestamp from './MessageTimestamp';

const MessageHeader = ({ name, time }) => (
  <>
    <span className="font-weight-bold">
      <span className="d-inline-block text-truncate align-top text-nowrap cb-username-max-length mr-1">
        {name}
      </span>
    </span>
    <MessageTimestamp time={time} />
  </>
);

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

  const textPartsClassNames = cn('text-break', {
    'cb-private-text': meta?.type === 'private',
  });

  return (
    <div className="d-flex align-items-baseline flex-wrap mb-1">
      <span className="d-flex flex-column">
        <span
          role="button"
          tabIndex={0}
          title={`Message (${name})`}
          data-user-id={userId}
          data-user-name={name}
          onContextMenu={displayMenu}
          onClick={displayMenu}
          onKeyPress={displayMenu}
        >
          <MessageHeader name={name} time={time} />
        </span>
        <span>
          <MessageTag messageType={meta?.type} />
          <span className={textPartsClassNames}>
            {parts.map((part, i) => renderMessagePart(part, i))}
          </span>
        </span>
      </span>
    </div>
  );
};

export default Message;
