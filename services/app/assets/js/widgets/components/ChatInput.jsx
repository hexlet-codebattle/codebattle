import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import ContentEditable from 'react-contenteditable';
import sanitizeHtml from 'sanitize-html';


export default function ChatInput({ onChange, onKeydown, message, onBlur }) {
  const innerRef = React.createRef();

  const sanitizeConf = {
    allowedTags: ["b", "i", "em", "strong", "a", "p", "h1"],
    allowedAttributes: { a: ["href"] }
  };

  return (
  <ContentEditable
    className="form-control border-secondary"
    onChange={onChange}
    html={message}
  />
  );
}
