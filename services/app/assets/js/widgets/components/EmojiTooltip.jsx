import React, { useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import customEmoji from '../lib/customEmoji';


// FIXME use bootstrap classes instead of styles
const selectStyles = {
  display: 'flex',
  flexDirection: 'column',
};

const containerStyles = {
  position: 'absolute',
  bottom: '39px',
  maxHeight: '100px',
  maxWidth: '300px',
  overflow: 'scroll',
  border: '1px solid #c3c3c3',
  borderRadius: '5px',
};

export default function EmojiTooltip({ message, handleSelect, hide }) {
  const lastIndexOfColons = message.lastIndexOf(':');
  const colons = message.slice(lastIndexOfColons + 1);
  const emojis = colons.length > 1
    ? customEmoji.filter(emoji => emoji.colons.includes(colons))
    : [];

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

  useHotkeys('escape', () => hide(), [emojis], { filter: e => e.target });
  useHotkeys('enter', e => {
    e.preventDefault();
    handleSelect(emojis[activeIndex]);
  }, [emojis], { filter: e => e.target });

  useHotkeys('up', e => {
    e.preventDefault();
    decreaseIndex();
  }, [emojis], { filter: e => e.target });

  useHotkeys('down', e => {
    e.preventDefault();
    increaseIndex();
  }, [emojis], { filter: e => e.target });

  const onChange = e => {
    const [currentIndex] = e.target.value;
    setActiveIndex(currentIndex);
  };


  if (emojis?.length === 0) {
    return null;
  }

  return (
    <div style={containerStyles}>
      <ul style={{ position: 'absolute', listStyle: 'none', left: '-40px' }}>
        {emojis.map(emoji => (
          <li key={emoji.name}>
            <img width={20} height={20} src={emoji.imageUrl} alt={emoji.colons} />
          </li>
        ))}
      </ul>
      <select multiple value={[activeIndex]} onChange={onChange} style={selectStyles}>
        {emojis?.map((emoji, i) => (
          <option
            onClick={() => handleSelect(emoji)}
            key={emoji.name}
            value={i}
            style={{ outline: 'none', paddingLeft: '25px', height: '24px' }}
            data-src={emoji.imageUrl}
            className="x-emoji-option"
          >
            {emoji.colons}
          </option>
        ))}
      </select>
    </div>
  );
}
