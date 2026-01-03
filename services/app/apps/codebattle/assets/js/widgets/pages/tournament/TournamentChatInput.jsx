import React, {
 useState, useCallback, useRef, useEffect,
} from 'react';

import BadWordsNext from 'bad-words-next';

import messageTypes from '../../config/messageTypes';
import { addMessage } from '../../middlewares/Chat';

export default function TournamentChatInput({ disabled }) {
  const [message, setMessage] = useState('');
  const [badwordsReady, setBadwordsReady] = useState(false);

  const inputRef = useRef(null);
  const badwordsRef = useRef(new BadWordsNext());
  const handleChange = useCallback(
    ({ target: { value } }) => {
      setMessage(value);
    },
    [setMessage],
  );

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      let filteredText = message;

      if (badwordsReady) {
        try {
          filteredText = badwordsRef.current.filter(filteredText);
        } catch (error) {
          console.error('Error filtering text:', error);
        }
      }

      const msg = {
        text: filteredText,
        meta: { type: messageTypes.general },
      };

      addMessage(msg);
      setMessage('');
    },
    [message, badwordsReady],
  );

  useEffect(() => {
    let mounted = true;
    async function loadBadwords() {
      try {
        const enData = await import('bad-words-next/lib/en');
        const ruData = await import('bad-words-next/lib/ru');
        const rlData = await import('bad-words-next/lib/ru_lat');

        if (mounted) {
          badwordsRef.current.add(enData.default || enData);
          badwordsRef.current.add(ruData.default || ruData);
          badwordsRef.current.add(rlData.default || rlData);
          setBadwordsReady(true);
        }
      } catch (error) {
        console.error('Error loading bad words dictionaries:', error);
      }
    }

    loadBadwords();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <form className="m-0" onSubmit={handleSubmit}>
      <div className="d-flex input-group shadow-sm rounded-bottom cb-border-color">
        <input
          type="text"
          ref={inputRef}
          className="form-control bg-dark rounded-0 border-0 border-top cb-border-color x-rounded-bottom-left"
          value={message}
          onChange={handleChange}
          placeholder="Write message..."
          disabled={disabled}
        />
        <div className="input-group-append cb-border-color">
          <button
            type="submit"
            className="btn btn-secondary cb-btn-secondary x-rounded-bottom-right border-0 rounded-0"
            disabled={disabled}
          >
            Send
          </button>
        </div>
      </div>
    </form>
  );
}
