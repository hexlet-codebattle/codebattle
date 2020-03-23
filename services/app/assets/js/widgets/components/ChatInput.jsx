import React, { useState } from 'react';
import ContentEditable from 'react-contenteditable';
import { Emoji } from 'emoji-mart';
import { connect, useSelector } from 'react-redux';
import sanitizeHtml from 'sanitize-html';
import { addMessage } from '../middlewares/Chat';
import * as selectors from '../selectors';
import EmojiPicker from './EmojiPicker';
import { useHotkeys } from 'react-hotkeys-hook';


const ChatInput = props => {
  const [caretPosition, setCaretPosition] = useState(0);
  const [msgHtml, setMsgHtml] = useState('');
  const [isEmojiPickerVisible, setEmojiPickerVisibility] = useState(false);
  // const [isTooltipVisible, setTooltipVisibility] = useState(false);
  const selector = useSelector((state) => ({ currentUser: selectors.currentChatUserSelector(state) }));

  const { innerRef } = props;
  const sanitizeConf = {
    allowedTags: ['img'],
    allowedAttributes: { img: ['src', 'width', 'height'] },
  };

  useHotkeys('enter', e => handleSubmit(e), [selector], { filter: e => e.target })

  const updateCaretPosition = () => {
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    const marker = document.createElement('span');
    range.insertNode(marker);
    const { offsetLeft } = marker;
    const containerPadding = window.getComputedStyle(innerRef.current).getPropertyValue('padding-left');
    const containerOffset = parseInt(containerPadding, 10);
    // fix chrome wrong offsetLeft in the beginning of the line
    const newPosition = offsetLeft || containerOffset;
    setCaretPosition(newPosition);
    range.deleteContents();
  };

  const handleSubmit = e => {
    if (e) e.preventDefault();
    const {
      currentUser: { name },
    } = selector;

    if (msgHtml) {
      addMessage(name, sanitizeHtml(msgHtml, sanitizeConf));
      setMsgHtml('');
    }
    innerRef.current.innerHTML = '';
    innerRef.current.focus();
    updateCaretPosition();
  };

  const handleChange = e => {
    // const isEmojiTooltipVisible = /.*:[a-zA-Z]{1,}([^ ])+$/.test(e.target.value);
    const normalizedMsg = e.target.value.replace(/<br>/, '&nbsp;');
    setMsgHtml(normalizedMsg);
  };

  const toggleEmojiPickerVisibility = () => setEmojiPickerVisibility(!isEmojiPickerVisible);

  const handleSelectEmodji = emoji => {
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    const image = new Image(20, 20);
    image.setAttribute('src', emoji.imageUrl);
    range.insertNode(image);
    const newMsgHtml = innerRef.current.innerHTML;
    setMsgHtml(newMsgHtml);
    setEmojiPickerVisibility(false);
    range.setStartAfter(image);
    selection.removeAllRanges();
    selection.addRange(range);
    updateCaretPosition();
  };

  // const hideEmojiTooltip = () => setTooltipVisibility(false);

  const hideEmojiPicker = () => setEmojiPickerVisibility(false);

  return (
    <form
      className="p-2 input-group input-group-sm position-absolute"
      style={{ bottom: 0 }}
      onSubmit={handleSubmit}
    >
      <div className="position-relative flex-grow-1 position-relative">
        <div className="x-emoji-cursor position-absolute" style={{ transform: `translateX(${caretPosition}px)` }} />
        <ContentEditable
          style={{ caretColor: 'transparent' }}
          className="form-control border-secondary"
          onChange={handleChange}
          html={msgHtml}
          innerRef={innerRef}
          onClick={updateCaretPosition}
          onKeyUp={updateCaretPosition}
        />
        <button
          type="button"
          className="btn btn-link position-absolute"
          style={{ right: '0', top: '3px', zIndex: 5 }}
          onClick={toggleEmojiPickerVisibility}
        >
          <Emoji emoji="grinning" set="apple" size={20} />
        </button>
      </div>
      {isEmojiPickerVisible && (
        <EmojiPicker
          handleSelect={handleSelectEmodji}
          hideEmojiPicker={hideEmojiPicker}
          isShown={isEmojiPickerVisible}
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
