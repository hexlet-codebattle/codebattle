import React, {
  useState, useEffect, useCallback, useRef,
} from 'react';

import data from '@emoji-mart/data';
import BadWordsNext from 'bad-words-next';
import cn from 'classnames';
import { SearchIndex, init } from 'emoji-mart';
import i18next from 'i18next';
import isEmpty from 'lodash/isEmpty';
import { useSelector } from 'react-redux';

import messageTypes from '../config/messageTypes';
import { addMessage } from '../middlewares/Chat';
import * as selectors from '../selectors';
import useClickAway from '../utils/useClickAway';

import EmojiPicker from './EmojiPicker';
import EmojiToolTip from './EmojiTooltip';

const MAX_MESSAGE_LENGTH = 1024;

const trimColons = message => message.slice(0, message.lastIndexOf(':'));

const getColons = message => message.slice(message.lastIndexOf(':') + 1);

const getTooltipVisibility = async msg => {
  const endsWithEmojiCodeRegex = /.*:[a-zA-Z]{0,}([^ ])+$/;
  if (!endsWithEmojiCodeRegex.test(msg)) return Promise.resolve(false);
  const colons = getColons(msg);
  return !isEmpty(await SearchIndex.search(colons));
};

export default function ChatInput({ inputRef, disabled = false }) {
  const [isPickerVisible, setPickerVisibility] = useState(false);
  const [isMaxLengthExceeded, setMaxLengthExceeded] = useState(false);
  const [isTooltipVisible, setTooltipVisibility] = useState(false);
  const [text, setText] = useState('');
  const [badwordsReady, setBadwordsReady] = useState(false);
  const activeRoom = useSelector(selectors.activeRoomSelector);
  const badwordsRef = useRef(new BadWordsNext());

  const sendBtnClassName = cn('btn btn-secondary cb-btn-secondary border-gray border-left rounded-right', {
    'cb-border-color': true,
  });
  const inputClassName = cn('form-control h-auto border-right-0 rounded-left', {
    'bg-dark cb-border-color text-white': true,
    'is-invalid': isMaxLengthExceeded,
  });
  const emojiBtnClassName = cn('btn border-left-0 border-right-0 px-2 py-0', {
    'cb-border-color border': true,
  });

  useEffect(() => {
    let mounted = true;
    async function loadBadwords() {
      try {
        // Import without extension to let webpack resolve the correct file
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

  const isMessageBlank = !text.trim();

  const handleChange = async ({ target: { value } }) => {
    if (value.length > MAX_MESSAGE_LENGTH) {
      setMaxLengthExceeded(true);
    } else {
      setMaxLengthExceeded(false);
    }
    setText(value);
    setTooltipVisibility(await getTooltipVisibility(value));
  };

  const handleSubmit = e => {
    e.preventDefault();

    if (isTooltipVisible || isMaxLengthExceeded || isMessageBlank) {
      return;
    }

    if (text) {
      let filteredText = text;

      if (badwordsReady) {
        try {
          filteredText = badwordsRef.current.filter(text);
        } catch (error) {
          console.error('Error filtering text:', error);
        }
      }

      const message = {
        text: filteredText,
        meta: {
          type: activeRoom.targetUserId ? messageTypes.private : messageTypes.general,
          targetUserId: activeRoom.targetUserId,
        },
      };

      addMessage(message);
      setText('');
    }
  };

  const togglePickerVisibility = useCallback(e => {
    e.stopPropagation();
    setPickerVisibility(!isPickerVisible);
  }, [setPickerVisibility, isPickerVisible]);

  const hidePicker = () => setPickerVisibility(false);

  const hideTooltip = () => setTooltipVisibility(false);

  const handleSelectEmodji = async ({ native }) => {
    const processedMessage = isTooltipVisible ? trimColons(text) : text;
    const input = inputRef.current;
    const caretPosition = input.selectionStart || 0;
    const before = processedMessage.slice(0, caretPosition);
    const after = processedMessage.slice(caretPosition);
    hidePicker();
    hideTooltip();
    await setText(`${before}${native}${after}`);
    input.focus();
    input.setSelectionRange(
      caretPosition + native.length,
      caretPosition + native.length,
    );
  };

  useClickAway(
    inputRef,
    () => {
      hideTooltip();
    },
    ['click'],
  );

  useEffect(() => {
    init({ data });
  }, []);

  return (
    <form
      className="border-top cb-border-color input-group mb-0 p-2"
      onSubmit={handleSubmit}
    >
      <input
        className={inputClassName}
        placeholder="Be nice in chat!"
        value={text}
        onChange={handleChange}
        ref={inputRef}
        disabled={disabled}
      />
      {isMaxLengthExceeded && (
        <div className="invalid-tooltip">
          Message length cannot exceed
          {' '}
          {MAX_MESSAGE_LENGTH}
          {' '}
          characters.
        </div>
      )}
      {isTooltipVisible && (
        <EmojiToolTip
          colons={getColons(text)}
          handleSelect={handleSelectEmodji}
          hide={hideTooltip}
        />
      )}
      {isPickerVisible && (
        <EmojiPicker
          handleSelect={handleSelectEmodji}
          hide={hidePicker}
          disabled={disabled}
        />
      )}
      <div className="input-group-append border-left rounded-right">
        <button
          type="button"
          className={emojiBtnClassName}
          onClick={togglePickerVisibility}
        >
          <em-emoji id="grinning" size={20} />
        </button>
        <button
          className={sendBtnClassName}
          type="button"
          onClick={handleSubmit}
          disabled={disabled || isMaxLengthExceeded || isMessageBlank}
        >
          {i18next.t('Send')}
        </button>
      </div>
    </form>
  );
}
