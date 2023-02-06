import React, { useState } from 'react';
import useKey from '../utils/useKey';

export default function EmojiTooltip({ emojis, handleSelect, hide }) {
  const [activeIndex, setActiveIndex] = useState(0);

  const increaseIndex = () => {
    setActiveIndex(prevIndex => {
      const increment = prevIndex !== emojis.length - 1 ? 1 : -emojis.length + 1;
      return prevIndex + increment;
    });
  };

  const decreaseIndex = () => {
    setActiveIndex(prevIndex => {
      const decrement = prevIndex !== 0 ? 1 : -emojis.length + 1;
      return prevIndex - decrement;
    });
  };

  useKey('Escape', () => hide());

  useKey('Enter', e => {
    e.preventDefault();
    handleSelect(emojis[activeIndex]);
  }, {}, [activeIndex, emojis]);

  useKey('ArrowUp', () => decreaseIndex(), {}, [emojis]);
  useKey('ArrowDown', () => increaseIndex(), {}, [emojis]);

  return (
    <select
      value={activeIndex}
      className="d-flex position-absolute flex-column border rounded w-50 x-bottom-75 custom-select mb-2"
      onChange={e => { setActiveIndex(e.target.value); }}
      onClick={() => { handleSelect(emojis[activeIndex]); }}
      size="4"
    >
      {emojis?.map((emoji, i) => (
        <option
          key={emoji.id}
          value={+i}
        >
          {emoji.native}
          {emoji.colons}
        </option>
      ))}
    </select>
  );
}
