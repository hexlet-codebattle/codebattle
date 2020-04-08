import React, { useState, useRef } from 'react';
import * as _ from 'lodash';
import { Emoji, emojiIndex } from 'emoji-mart';
import { addMessage } from '../middlewares/Chat';
import EmojiPicker from './EmojiPicker';
import EmojiToolTip from './EmojiTooltip';

const trimColons = message => message.slice(0, message.lastIndexOf(':'));

const getColons = message => message.slice(message.lastIndexOf(':') + 1);

const getTooltipVisibility = msg => {
  const endsWithEmojiCodeRegex = /.*:[a-zA-Z]{1,}([^ ])+$/;
  if (!endsWithEmojiCodeRegex.test(msg)) return false;
  const colons = getColons(msg);
  return !_.isEmpty(emojiIndex.search(colons));
};

export default function ChatInput() {
  const [isPickerVisible, setPickerVisibility] = useState(false);
  const [isTooltipVisible, setTooltipVisibility] = useState(false);
  const [message, setMessage] = useState('');
  const inputRef = useRef(null);

  const handleChange = ({ target: { value } }) => {
    setTooltipVisibility(getTooltipVisibility(value));
    setMessage(value);
  };

  const handleSubmit = e => {
    e.preventDefault();

    if (message) {
      addMessage(message);
      setMessage('');
    }
  };

  const togglePickerVisibility = () => setPickerVisibility(!isPickerVisible);

  const hidePicker = () => setPickerVisibility(false);

  const hideTooltip = () => setTooltipVisibility(false);

  const handleSelectEmodji = async ({ native }) => {
    const processedMessage = isTooltipVisible ? trimColons(message) : message;
    const input = inputRef.current;
    const caretPosition = input.selectionStart || 0;
    const before = processedMessage.slice(0, caretPosition);
    const after = processedMessage.slice(caretPosition);
    await setMessage(`${before}${native}${after}`);
    hidePicker();
    hideTooltip();
    input.focus();
    input.setSelectionRange(caretPosition + native.length, caretPosition + native.length);
  };

  const handleInputKeydown = e => {
    if (e.key === 'Enter' && isTooltipVisible) {
      e.preventDefault();
    }
  };


  return (
    <form
      className="p-2 input-group input-group-sm position-absolute x-bottom-0"
      onSubmit={handleSubmit}
    >
      <input
        className="form-control border-secondary pr-4"
        placeholder="Type message here..."
        value={message}
        onChange={handleChange}
        onKeyDown={handleInputKeydown}
        onBlur={hideTooltip}
        ref={inputRef}
      />
      <button
        type="button"
        className="btn btn-link position-absolute cb-emoji-button"
        onClick={togglePickerVisibility}
      >
        <Emoji emoji="grinning" set="apple" size={20} />
      </button>
      {isTooltipVisible && (
        <EmojiToolTip
          emojis={emojiIndex.search(getColons(message))}
          handleSelect={handleSelectEmodji}
          hide={hideTooltip}
        />
      )}
      { isPickerVisible && (
      <EmojiPicker
        handleSelect={handleSelectEmodji}
        hide={hidePicker}
      />
      )}
      <div className="input-group-append">
        <button className="btn btn-outline-secondary" type="button" onClick={handleSubmit}>
          Send
        </button>
      </div>
    </form>
  );
}
