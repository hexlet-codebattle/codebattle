import React from 'react';

import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

import useKey from '../utils/useKey';

export default function EmojiPicker({ handleSelect, hide, disabled = false }) {
  useKey('Escape', () => hide(), { event: 'keyup' });

  const handleOnClickOutside = () => hide();

  return (
    <Picker
      data={data}
      previewPosition="none"
      skinTonePosition="none"
      perLine={8}
      emojiSize={20}
      onEmojiSelect={handleSelect}
      onClickOutside={handleOnClickOutside}
      autoFocus
      disabled={disabled}
    />
  );
}
