/* eslint-disable react/no-danger */

import React from 'react';

const Message = ({ message = '', user = '' }) => {
  const innerHtml = `<b>${user}</b>: ${message}`;
  return (
    <div>
      <div dangerouslySetInnerHTML={{ __html: innerHtml }} />
    </div>
  );
};

export default Message;
