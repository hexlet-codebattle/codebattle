import React, { useRef } from 'react';
import { Picker } from 'emoji-mart';
import { useHotkeys } from 'react-hotkeys-hook';
import 'emoji-mart/css/emoji-mart.css';

export default function EmojiPicker({ handleSelect, hide }) {
  const wrapperRef = useRef(null);
  useHotkeys('escape', hide);

  const handleBlur = e => {
    const isActivePicker = wrapperRef.current.isEqualNode(e.currentTarget);
    if (isActivePicker) return;
    hide();
  };

  return (
    <div onBlur={handleBlur} ref={wrapperRef}>
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
