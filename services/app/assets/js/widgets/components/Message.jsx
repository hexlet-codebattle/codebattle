import React from 'react';

const Message = ({ message = '', user = '' }) => {
  console.log('message', message);
  return (
  <div>
    <span className="font-weight-bold">{`${user}: `}</span>
    <div dangerouslySetInnerHTML={{ __html: message }}></div>
  </div>
);
  };

export default Message;
