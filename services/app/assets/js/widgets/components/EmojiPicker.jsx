import React, { useRef } from 'react';
import { Picker } from 'emoji-mart';
import { useKey, useClickAway } from 'react-use';
import 'emoji-mart/css/emoji-mart.css';

export default function EmojiPicker({ handleSelect, hide }) {
  const wrapperRef = useRef(null);
  useKey('Escape', () => hide());

  useClickAway(wrapperRef, () => {
    hide();
  }, ['click']);

  return (
    <div ref={wrapperRef}>
      <Picker
        showPreview={false}
        showSkinTones={false}
        perLine={10}
        onClick={handleSelect}
        autoFocus
        style={{ position: 'absolute', right: '88px', bottom: '10px' }}
      />
    </div>
  );
}
