import React, { useState, useEffect } from 'react';

import { SearchIndex } from 'emoji-mart';
import isEmpty from 'lodash/isEmpty';

import useKey from '../utils/useKey';

export default function EmojiTooltip({ colons, handleSelect, hide }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [emojis, setEmojis] = useState([]);

  const increaseIndex = () => {
    setActiveIndex(prevIndex => {
      const increment = prevIndex !== emojis.length - 1 ? 1 : -emojis.length + 1;
      return prevIndex + increment;
    });
  };

  useEffect(() => {
    const fetchEmojis = async () => {
      const rawEmojis = await SearchIndex.search(colons);
      const preparedEmojis = rawEmojis.map(emoji => ({
        ...emoji,
        native: emoji.skins[0].native,
        colons: emoji.skins[0].shortcodes,
      }));
      setEmojis(preparedEmojis);
    };

    fetchEmojis();
  }, [colons]);

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
      {!isEmpty(emojis) && emojis.map((emoji, i) => (
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
