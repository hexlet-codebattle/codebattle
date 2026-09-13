import React, { useState, useEffect } from 'react';

import { SearchIndex } from 'emoji-mart';
import isEmpty from 'lodash/isEmpty';

import useKey from '../utils/useKey';

interface EmojiItem {
  id: string;
  native: string;
  colons: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

interface EmojiTooltipProps {
  query: string;
  handleSelect: (emoji: EmojiItem) => void;
  hide: () => void;
}

export default function EmojiTooltip({ query, handleSelect, hide }: EmojiTooltipProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [emojis, setEmojis] = useState<EmojiItem[]>([]);

  const increaseIndex = () => {
    setActiveIndex((prevIndex) => {
      const increment = prevIndex !== emojis.length - 1 ? 1 : -emojis.length + 1;
      return prevIndex + increment;
    });
  };

  useEffect(() => {
    const fetchEmojis = async () => {
      const rawEmojis = await SearchIndex.search(query);
      const preparedEmojis = rawEmojis.map((emoji: EmojiItem) => ({
        ...emoji,
        native: emoji.skins[0].native,
        colons: emoji.skins[0].shortcodes,
      }));
      setEmojis(preparedEmojis);
    };

    fetchEmojis();
  }, [query]);

  const decreaseIndex = () => {
    setActiveIndex((prevIndex) => {
      const decrement = prevIndex !== 0 ? 1 : -emojis.length + 1;
      return prevIndex - decrement;
    });
  };

  useKey('Escape', () => hide());

  useKey(
    'Enter',
    (e) => {
      e.preventDefault();
      handleSelect(emojis[activeIndex]);
    },
    {},
    [activeIndex, emojis],
  );

  useKey('ArrowUp', () => decreaseIndex(), {}, [emojis]);
  useKey('ArrowDown', () => increaseIndex(), {}, [emojis]);

  return (
    <select
      value={activeIndex}
      style={{
        position: 'absolute',
        bottom: '75%',
        display: 'flex',
        flexDirection: 'column',
        width: '50%',
        marginBottom: 'var(--mantine-spacing-sm)',
        border: '1px solid var(--mantine-color-default-border)',
        borderRadius: 'var(--mantine-radius-sm)',
        backgroundColor: 'var(--mantine-color-dark-6)',
        color: 'var(--mantine-color-white)',
      }}
      onChange={(e) => {
        setActiveIndex(e.target.value as unknown as number);
      }}
      onClick={() => {
        handleSelect(emojis[activeIndex]);
      }}
      size={4}
    >
      {!isEmpty(emojis) &&
        emojis.map((emoji, i) => (
          <option key={emoji.id} value={+i}>
            {emoji.native}
            {emoji.colons}
          </option>
        ))}
    </select>
  );
}
