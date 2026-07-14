import React from 'react';

import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';

import useKey from '../utils/useKey';

export interface EmojiSelection {
  native: string;
}

interface EmojiPickerProps {
  disabled?: boolean;
  handleSelect: (emoji: EmojiSelection) => void;
  hide: () => void;
}

export default function EmojiPicker({ handleSelect, hide, disabled = false }: EmojiPickerProps) {
  useKey('Escape', hide, { event: 'keyup' });

  return (
    <Picker
      data={data}
      previewPosition="none"
      skinTonePosition="none"
      perLine={8}
      emojiSize={20}
      onEmojiSelect={handleSelect}
      onClickOutside={hide}
      autoFocus
      disabled={disabled}
    />
  );
}
