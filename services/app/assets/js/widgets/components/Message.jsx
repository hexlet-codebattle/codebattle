/* eslint-disable react/no-danger */
import React from 'react';
import sanitizeHTML from 'sanitize-html';

const Message = ({ message = '', user = '' }) => {
  const sanitizeConf = {
    allowedTags: ['img'],
    allowedAttributes: { img: ['src', 'width', 'height'] },
  };
  const innerHtml = `<b>${user}</b>: ${message}`;
  return (
    <div>
      <div dangerouslySetInnerHTML={{ __html: sanitizeHTML(innerHtml, sanitizeConf) }} />
    </div>
  );
};

export default Message;
