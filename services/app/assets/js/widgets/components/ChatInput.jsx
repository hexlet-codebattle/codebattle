import React from 'react';
import ContentEditable from 'react-contenteditable';

export default function ChatInput({ onChange, message }) {
  return (
    <ContentEditable
      className="form-control border-secondary"
      onChange={onChange}
      html={message}
    />
  );
}
