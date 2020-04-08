import React, { useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';

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

  useHotkeys('escape', () => hide(), [], { filter: e => e.target });
  useHotkeys('enter', e => {
    e.preventDefault();
    handleSelect(emojis[activeIndex]);
    hide();
  }, [], { filter: e => e.target });

  useHotkeys('up', () => decreaseIndex(), [], { filter: e => e.target });
  useHotkeys('down', () => increaseIndex(), [], { filter: e => e.target });

  const onChange = e => {
    const [currentIndex] = e.target.value;
    setActiveIndex(currentIndex);
  };

  return (
    <select
      multiple
      value={[activeIndex]}
      onChange={onChange}
      className="d-flex position-absolute flex-column border rounded w-50 x-bottom-75"
    >
      {emojis?.map((emoji, i) => (
        <option
          onClick={() => handleSelect(emoji)}
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
