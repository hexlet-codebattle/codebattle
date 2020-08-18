import React from 'react';

const Message = ({ message = '', user = '' }) => {
  const parts = message.split(/(@+[-a-zA-Z0-9_]+\b)/g);

  return (
    <div>
      <span className="font-weight-bold">{`${user}: `}</span>
      <span>
        {/* eslint-disable-next-line react/no-array-index-key */}
        {parts.map((part, i) => (part.slice(1) === user ? <span key={i} className="font-weight-bold bg-warning">{part}</span> : `${part}`))}
      </span>
    </div>
  );
};

export default Message;
