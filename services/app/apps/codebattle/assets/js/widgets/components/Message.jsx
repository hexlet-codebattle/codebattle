import React from 'react';
import moment from 'moment';

import Sender from './Sender';
import MessageTag from './MessageTag';

const Message = ({
  text = '',
  name = '',
  type,
  time,
  userId,
  handleShowModal,
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
      <Sender
        messageId={messageId}
        name={name}
        userId={userId}
        handleShowModal={handleShowModal}
      />
      <span className="ml-1 text-break">
        {parts.map((part, i) => renderMessagePart(part, i))}
      </span>
    </div>
  );
};

export default Message;
