import React from 'react';

import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

import useKey from '../utils/useKey';

export default function EmojiPicker({ disabled = false, handleSelect, hide }) {
  useKey('Escape', () => hide(), { event: 'keyup' });

  const handleOnClickOutside = () => hide();

  return (
    <Picker
      autoFocus
      data={data}
      disabled={disabled}
      emojiSize={20}
      perLine={8}
      previewPosition="none"
      skinTonePosition="none"
      onClickOutside={handleOnClickOutside}
      onEmojiSelect={handleSelect}
    />
  );
}
