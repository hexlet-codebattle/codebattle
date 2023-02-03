import React, { useState, useRef, useEffect } from 'react';
import * as _ from 'lodash';
import { SearchIndex, init } from 'emoji-mart';
import data from '@emoji-mart/data';
import useClickAway from '../utils/useClickAway';
import { addMessage } from '../middlewares/Chat';
import EmojiPicker from './EmojiPicker';
import EmojiToolTip from './EmojiTooltip';

const trimColons = message => message.slice(0, message.lastIndexOf(':'));

const getColons = message => message.slice(message.lastIndexOf(':') + 1);

const getTooltipVisibility = async msg => {
  const endsWithEmojiCodeRegex = /.*:[a-zA-Z]{0,}([^ ])+$/;
  if (!endsWithEmojiCodeRegex.test(msg)) return Promise.resolve(false);
  const colons = getColons(msg);
  return !_.isEmpty(await SearchIndex.search(colons));
};

export default function ChatInput() {
  const [isPickerVisible, setPickerVisibility] = useState(false);
  const [isTooltipVisible, setTooltipVisibility] = useState(false);
  const [message, setMessage] = useState('');
  const inputRef = useRef(null);

  const handleChange = async ({ target: { value } }) => {
    setMessage(value);
    setTooltipVisibility(await getTooltipVisibility(value));
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

  useEffect(() => {
    init({ data });
  }, []);

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
          colons={getColons(message)}
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
          <em-emoji id="grinning" size={20} />
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
