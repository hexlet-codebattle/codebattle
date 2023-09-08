import React, { useState, useCallback, useRef } from 'react';

import { addMessage } from '../../middlewares/Chat';

export default function TournamentChatInput({ disabled }) {
  const [message, setMessage] = useState('');
  const inputRef = useRef(null);
  const handleChange = useCallback(
    ({ target: { value } }) => {
      setMessage(value);
    },
    [setMessage],
  );

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      addMessage(message);
      setMessage('');
    },
    [message],
  );

  return (
    <form className="m-0" onSubmit={handleSubmit}>
      <div className="d-flex input-group shadow-sm rounded-bottom border-top">
        <input
          ref={inputRef}
          className="form-control rounded-0 border-0 border-top x-rounded-bottom-left"
          disabled={disabled}
          placeholder="Write message..."
          type="text"
          value={message}
          onChange={handleChange}
        />
        <div className="input-group-append">
          <button
            className="btn btn-secondary x-rounded-bottom-right border-0 rounded-0"
            disabled={disabled}
            type="submit"
          >
            Send
          </button>
        </div>
      </div>
    </form>
  );
}
