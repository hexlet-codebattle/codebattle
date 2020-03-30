import React, { useState, useRef, useEffect } from 'react';
import { addMessage } from '../middlewares/Chat';
import { Emoji } from 'emoji-mart';
import EmojiPicker from '../components/EmojiPicker';
import EmojiToolTip from '../components/EmojiTooltip';
import { redirectToNewGame } from '../actions';


const ChatInput = () => {
  const [isPickerVisible, setPickerVisibility] = useState(false);
  const [isTooltipVisible, setTooltipVisibility] = useState(false);
  const [message, setMessage] = useState('');
  const inputRef = useRef(null);

  // useEffect(() => {
  //   const { selectionStart, selectionEnd } = inputRef.current
  //   inputRef.current.focus();
  //   inputRef.current.setSelectionRange(selectionStart, selectionEnd);
  // }, [message]);

  const handleChange = ({ target: { value } }) => {
    setTooltipVisibility(/.*:[a-zA-Z]{1,}([^ ])+$/.test(value));
    setMessage(value);
  };

  const handleSubmit = e => {
    e.preventDefault();

    if (message) {
      addMessage(name, message);
      setMessage('');
    }
  };

  const togglePickerVisibility = () => setPickerVisibility(!isPickerVisible);

  const hidePicker = () => setPickerVisibility(false);

  const handleSelectEmodji = (colons = null) => async ({ native }) => {
    const messageWithoutColons = colons ? message.slice(0, -colons.length - 2) : message;
    const caretPosition = inputRef.current.selectionStart || 0;
    const before = messageWithoutColons.slice(0, caretPosition);
    const after = messageWithoutColons.slice(caretPosition);
    setMessage(`${before}${native}${after}`);
    hidePicker();
    hideTooltip();
    await inputRef.current.focus();
    inputRef.current.setSelectionRange(caretPosition + native.length, caretPosition + native.length)
  };

  const handleInputKeydown = e => {
    if (e.key === 'Enter' && isTooltipVisible) {
      e.preventDefault();
    }
  };

  const hideTooltip = () => setTooltipVisibility(false);

  return (
    <form
      className="p-2 input-group input-group-sm position-absolute"
      style={{ bottom: 0 }}
      onSubmit={handleSubmit}
    >
      <input
        className="form-control border-secondary relative"
        placeholder="Type message here..."
        value={message}
        onChange={handleChange}
        onKeyDown={handleInputKeydown}
        ref={inputRef}
      />
      <button
        type="button"
        className="btn btn-link position-absolute"
        style={{ right: '50px', zIndex: 5 }}
        onClick={togglePickerVisibility}
      >
        <Emoji emoji="grinning" set="apple" size={20} />
      </button>
      {isTooltipVisible && (
        <EmojiToolTip
          message={message}
          handleSelect={handleSelectEmodji}
          hide={hideTooltip}
        />
      )}
      {isPickerVisible && (
        <EmojiPicker
          handleSelect={handleSelectEmodji}
          hide={hidePicker}
          isShown={isPickerVisible}
        />
      )}
      <div className="input-group-append">
        <button className="btn btn-outline-secondary" type="button" onClick={handleSubmit}>
          Send
        </button>
      </div>
    </form>
  );
};

export default ChatInput;
