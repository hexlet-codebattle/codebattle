import React, { useState, useCallback, useRef } from 'react';

import { addMessage } from '../../middlewares/Chat';

export default function TournamentChatInput({ disabled }) {
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
    <form className="m-0" onSubmit={handleSubmit}>
      <div className="d-flex input-group shadow-sm rounded-bottom border-top">
        <input
          type="text"
          ref={inputRef}
          className="form-control rounded-0 border-0 border-top x-rounded-bottom-left"
          value={message}
          onChange={handleChange}
          placeholder="Write message..."
          disabled={disabled}
        />
        <div className="input-group-append">
          <button
            type="submit"
            className="btn btn-secondary x-rounded-bottom-right border-0 rounded-0"
            disabled={disabled}
          >
            Send
          </button>
        </div>
      </div>
    </form>
  );
}
