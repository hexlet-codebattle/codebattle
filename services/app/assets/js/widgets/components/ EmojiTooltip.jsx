import React, { useEffect, useState } from 'react';
import { emojiIndex } from 'emoji-mart';
import { useHotkeys } from 'react-hotkeys-hook';

const selectStyles = {
  position: 'absolute',
  bottom: '39px',
  display: 'flex',
  flexDirection: 'column',
  maxHeight: '100px',
  maxWidth: '300px',
  overflow: 'scroll',
  border: '1px solid #c3c3c3',
  borderRadius: '5px',
};


export default function EmojiTooltip({ message, handleSelect, hide }) {
  const lastIndexOfColons = message.lastIndexOf(':');
  const colons = message.slice(lastIndexOfColons + 1);
  const emojies = emojiIndex.search(colons);

  const [activeIndex, setActiveIndex] = useState(0);

  const increaseIndex = () => {
    setActiveIndex(prevIndex => {
      const increment = prevIndex !== emojies.length - 1 ? 1 : -emojies.length + 1;
      return prevIndex + increment;
    })
  };

  const decreaseIndex = () => {
    setActiveIndex(prevIndex => {
      const decrement = prevIndex !== 0 ? 1 : -emojies.length + 1;
      return prevIndex - decrement;
    })
  };

  useHotkeys('escape', () => hide(), [], { filter: (e) => e.target });
  useHotkeys('enter', () => {
    handleSelect(colons)(emojies[activeIndex]);
    hide();
  }, [], { filter: (e) => e.target })

  useHotkeys('up', () => decreaseIndex(), [], { filter: (e) => e.target });
  useHotkeys('down', () => increaseIndex(), [], { filter: (e) => e.target });



  // const keydownListener = e => {
  //   // if (e.key === 'Escape') {
  //   //   hide();
  //   // }

  //   if (e.key === 'Enter') {
  //     handleSelect(colons)(emojies[activeIndex]);
  //     hide();
  //   }

  //   if (e.key === 'ArrowDown') {
  //     setActiveIndex(prevIndex => {
  //       const increment = prevIndex !== emojies.length - 1 ? 1 : -emojies.length + 1;
  //       return prevIndex + increment;
  //     });
  //   }

  //   if (e.key === 'ArrowUp') {
  //     setActiveIndex(prevIndex => {
  //       const decrement = prevIndex !== 0 ? 1 : -emojies.length + 1;
  //       return prevIndex - decrement;
  //     });
  //   }
  // };

  // useEffect(() => {
    // document.body.addEventListener('keydown', keydownListener);
    // return () => document.body.removeEventListener('keydown', keydownListener);
  // }, []);

  const onChange = e => {
    const [currentIndex] = e.target.value;
    setActiveIndex(currentIndex);
  };


  if (emojies?.length === 0) {
    return null;
  }

  return (
    <select multiple value={[activeIndex]} onChange={onChange} style={selectStyles}>
      {emojies?.map((emoji, i) => (
        <option
          onClick={() => handleSelect(colons)(emoji)}
          key={emoji.id}
          value={+i}
          style={{ outline: 'none' }}
        >
          {emoji.native}
          {emoji.colons}
        </option>
      ))}
    </select>
  );
}
