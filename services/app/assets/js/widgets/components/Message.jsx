import React from 'react';

const Message = ({ message = '', user = '' }) => (
  <div>
    <span className="font-weight-bold">{`${user}: `}</span>
    <span>{message}</span>
  </div>
);

export default Message;
