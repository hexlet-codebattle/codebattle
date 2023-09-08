import React, { useState, useEffect } from 'react';

import data from '@emoji-mart/data';
import { SearchIndex, init } from 'emoji-mart';
import isEmpty from 'lodash/isEmpty';
import { useSelector } from 'react-redux';

import messageTypes from '../config/messageTypes';
import { addMessage } from '../middlewares/Chat';
import * as selectors from '../selectors';
import useClickAway from '../utils/useClickAway';

import EmojiPicker from './EmojiPicker';
import EmojiToolTip from './EmojiTooltip';

const trimColons = (message) => message.slice(0, message.lastIndexOf(':'));

const getColons = (message) => message.slice(message.lastIndexOf(':') + 1);

const getTooltipVisibility = async (msg) => {
  const endsWithEmojiCodeRegex = /.*:[a-zA-Z]{0,}([^ ])+$/;
  if (!endsWithEmojiCodeRegex.test(msg)) return Promise.resolve(false);
  const colons = getColons(msg);
  return !isEmpty(await SearchIndex.search(colons));
};

export default function ChatInput({ disabled = false, inputRef }) {
  const [isPickerVisible, setPickerVisibility] = useState(false);
  const [isTooltipVisible, setTooltipVisibility] = useState(false);
  const [text, setText] = useState('');
  const activeRoom = useSelector(selectors.activeRoomSelector);

  const handleChange = async ({ target: { value } }) => {
    setText(value);
    setTooltipVisibility(await getTooltipVisibility(value));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const message = {
      text,
      meta: {
        type: activeRoom.targetUserId ? messageTypes.private : messageTypes.general,
        targetUserId: activeRoom.targetUserId,
      },
    };
    if (isTooltipVisible) {
      return;
    }
    if (text) {
      addMessage(message);
      setText('');
    }
  };

  const togglePickerVisibility = () => setPickerVisibility(!isPickerVisible);

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
    input.setSelectionRange(caretPosition + native.length, caretPosition + native.length);
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
    <form className="border-top input-group mb-0 p-2" onSubmit={handleSubmit}>
      <input
        ref={inputRef}
        className="form-control h-auto border-gray border-right-0 rounded-left"
        disabled={disabled}
        placeholder="Please be nice in the chat!"
        value={text}
        onChange={handleChange}
      />
      {isTooltipVisible && (
        <EmojiToolTip
          colons={getColons(text)}
          handleSelect={handleSelectEmodji}
          hide={hideTooltip}
        />
      )}
      {isPickerVisible && (
        <EmojiPicker disabled={disabled} handleSelect={handleSelectEmodji} hide={hidePicker} />
      )}
      <div className="input-group-append border-left rounded-right">
        <button
          className="btn bg-white border-gray border-left-0 border-right-0 px-2 py-0"
          type="button"
          onClick={togglePickerVisibility}
        >
          <em-emoji id="grinning" size={20} />
        </button>
        <button
          className="btn btn-secondary border-gray border-left rounded-right"
          disabled={disabled}
          type="button"
          onClick={handleSubmit}
        >
          Send
        </button>
      </div>
    </form>
  );
}
