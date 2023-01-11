import React, { useState, useRef } from 'react';
import * as _ from 'lodash';
import { Emoji, emojiIndex } from 'emoji-mart';
import useClickAway from '../utils/useClickAway';
import { addMessage } from '../middlewares/Chat';
import EmojiPicker from './EmojiPicker';
import EmojiToolTip from './EmojiTooltip';

const trimColons = message => message.slice(0, message.lastIndexOf(':'));

const getColons = message => message.slice(message.lastIndexOf(':') + 1);

const getTooltipVisibility = msg => {
  const endsWithEmojiCodeRegex = /.*:[a-zA-Z]{0,}([^ ])+$/;
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
    if (isTooltipVisible) {
      return;
    }
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
    hidePicker();
    hideTooltip();
    await setMessage(`${before}${native}${after}`);
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

  return (
    <form
      className="p-2 input-group input-group-sm"
      onSubmit={handleSubmit}
    >
      <input
        className="h-auto form-control border-secondary"
        placeholder="Please be nice in the chat!"
        value={message}
        onChange={handleChange}
        ref={inputRef}
      />
      {isTooltipVisible && (
        <EmojiToolTip
          emojis={emojiIndex.search(getColons(message))}
          handleSelect={handleSelectEmodji}
          hide={hideTooltip}
        />
      )}
      {isPickerVisible && (
        <EmojiPicker handleSelect={handleSelectEmodji} hide={hidePicker} />
      )}
      <div className="input-group-append bg-white">
        <button
          type="button"
          className="btn btn-outline-secondary py-0 px-1"
          onClick={togglePickerVisibility}
        >
          <Emoji emoji="grinning" native size={20} emojiTooltip="true" />
        </button>
        <button
          className="btn btn-outline-secondary"
          type="button"
          onClick={handleSubmit}
        >
          Send
        </button>
      </div>
    </form>
  );
}
