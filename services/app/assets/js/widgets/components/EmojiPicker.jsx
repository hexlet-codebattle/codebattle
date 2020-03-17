import React from 'react';
import { Picker } from 'emoji-mart';
import { useHotkeys } from 'react-hotkeys-hook';
import 'emoji-mart/css/emoji-mart.css';
import customEmoji from '../lib/customEmoji';

export default function EmojiPicker({ handleSelect, hideEmojiPicker }) {
  useHotkeys('escape', hideEmojiPicker);

  return (
    <Picker
      showPreview={false}
      showSkinTones={false}
      darkMode={false}
      perLine={10}
      include={["custom"]}
      custom={customEmoji}
      onClick={handleSelect}
      emojiTooltip={true}
      style={{ position: 'absolute', right: '88px', bottom: '10px' }}
    />
  );
}
