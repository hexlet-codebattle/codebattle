import React from 'react';
import { Picker } from 'emoji-mart';
import { useHotkeys } from 'react-hotkeys-hook';
import 'emoji-mart/css/emoji-mart.css';

export default function EmojiPicker({ handleSelect, hide }) {
  useHotkeys('escape', hide);

  return (
    <Picker
      showPreview={false}
      showSkinTones={false}
      darkMode={false}
      perLine={10}
      onClick={handleSelect}
      style={{ position: 'absolute', right: '88px', bottom: '10px' }}
    />
  );
}
