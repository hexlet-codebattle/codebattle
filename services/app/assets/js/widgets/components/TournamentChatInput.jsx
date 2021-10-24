import React, { useState, useCallback, useRef } from 'react';
import { addMessage } from '../middlewares/Chat';

export default function TournamentChatInput() {
  const [message, setMessage] = useState('');
  const inputRef = useRef(null);
  const handleChange = useCallback(({ target: { value } }) => {
    setMessage(value);
  }, [setMessage]);

  const handleSubmit = useCallback(e => {
    e.preventDefault();
    addMessage(message);
    setMessage('');
  }, [message]);

  return (
    <form onSubmit={handleSubmit}>
      <div className="d-flex shadow-sm rounded-bottom">
        <input
          className="form-control rounded-0 border-0 border-top x-rounded-bottom-left"
          placeholder="write your message here..."
          type="text"
          value={message}
          onChange={handleChange}
          ref={inputRef}
        />
        <button
          className="btn btn-outline-secondary x-rounded-bottom-right rounded-0"
          type="submit"
        >
          Send
        </button>
      </div>
    </form>
  );
}
