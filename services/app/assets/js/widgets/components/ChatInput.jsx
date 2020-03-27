import React, { useState, useRef } from 'react';
import ContentEditable from 'react-contenteditable';
import { Emoji } from 'emoji-mart';
import { useSelector } from 'react-redux';
import { useHotkeys } from 'react-hotkeys-hook';
import sanitizeHtml from 'sanitize-html';
import { addMessage } from '../middlewares/Chat';
import * as selectors from '../selectors';
import EmojiPicker from './EmojiPicker';
import EmojiTooltip from './EmojiTooltip';


const ChatInput = () => {
  const [caretPosition, setCaretPosition] = useState(0);
  const [msgHtml, setMsgHtml] = useState('');
  const [isEmojiPickerVisible, setEmojiPickerVisibility] = useState(false);
  const [isEmojiTooltipVisible, setEmojiTooltipVisibility] = useState(false);
  const innerRef = useRef(null);
  const selector = useSelector(state => (
    { currentUser: selectors.currentChatUserSelector(state) }));

  const sanitizeConf = {
    allowedTags: ['img'],
    allowedAttributes: { img: ['src', 'width', 'height'] },
  };

  // the only way to find out the current position of a caret (i.e. its left offsef
  // from contenteditable div border) is to phisically insert a non-text node (marker)
  // where the caret is, get that node's offsetLeft value and them remove it
  const updateCaretPosition = () => {
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    const marker = document.createElement('span');
    range.insertNode(marker);
    const { offsetLeft } = marker;
    const containerPadding = window.getComputedStyle(innerRef.current).getPropertyValue('padding-left');
    const containerOffset = parseInt(containerPadding, 10);
    // fix chrome wrong offsetLeft when the caret is in the beginning of the line
    const newPosition = offsetLeft || containerOffset;
    setCaretPosition(newPosition);
    range.deleteContents();
  };

  const handleSubmit = e => {
    e.preventDefault();
    const { currentUser: { name } } = selector;

    if (msgHtml) {
      addMessage(name, sanitizeHtml(msgHtml, sanitizeConf));
      setMsgHtml('');
    }
    innerRef.current.innerHTML = '';
    innerRef.current.focus();
    updateCaretPosition();
  };

  useHotkeys('enter', e => handleSubmit(e), [selector], { filter: e => e.target });

  const handleChange = e => {
    if (/.*:[a-zA-Z]{1,}([^ ])+$/.test(e.target.value)) {
      setEmojiTooltipVisibility(true);
    }
    const normalizedMsg = e.target.value.replace(/<br>/, '&nbsp;');
    setMsgHtml(normalizedMsg);
  };

  const toggleEmojiPickerVisibility = () => {
    setEmojiPickerVisibility(!isEmojiPickerVisible);
  };

  const trimColons = () => {
    if (isEmojiTooltipVisible) {
      const trimmedMsgHtml = msgHtml.slice(0, msgHtml.lastIndexOf(':'));
      setMsgHtml(trimmedMsgHtml);
    }
  };

  const handleSelectEmodji = emoji => {
    innerRef.current.focus();
    trimColons();
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    const image = new Image(20, 20);
    image.setAttribute('src', emoji.imageUrl);
    range.insertNode(image);
    const newMsgHtml = innerRef.current.innerHTML;
    setMsgHtml(newMsgHtml);
    setEmojiPickerVisibility(false);
    setEmojiTooltipVisibility(false);
    range.setStartAfter(image);
    selection.removeAllRanges();
    selection.addRange(range);
    updateCaretPosition();
  };

  const hideEmojiTooltip = () => setEmojiTooltipVisibility(false);

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
      {isEmojiPickerVisible
        && (
        <EmojiPicker
          handleSelect={handleSelectEmodji}
          hideEmojiPicker={hideEmojiPicker}
          isShown={isEmojiPickerVisible}
        />
        )}
      {isEmojiTooltipVisible
        && (
        <EmojiTooltip
          message={msgHtml}
          handleSelect={handleSelectEmodji}
          hide={hideEmojiTooltip}
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
