import React from 'react';

const Message = ({ message = '', userName = '' }) => {
  if (!message) {
    return null;
  }

  const parts = message.split(/(@+[-a-zA-Z0-9_]+\b)/g);

  const renderMessagePart = (part, i) => {
    if (part.slice(1) === userName) {
      return (
        <span key={i} className="font-weight-bold bg-warning">
          {part}
        </span>
      );
    } if (part.startsWith('@')) {
      return (
        <span key={i} className="font-weight-bold text-primary">
          {part}
        </span>
      );
    }
      return part;
  };

  return (
    <div>
      {/* eslint-disable-next-line react/no-array-index-key */}
      <span className="font-weight-bold">{`${userName}: `}</span>
      <span>{parts.map((part, i) => renderMessagePart(part, i))}</span>
    </div>
  );
};

export default Message;
