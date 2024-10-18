import { useState, useRef, useCallback } from 'react';

function useHover() {
  const [hovering, setHovering] = useState(false);
  const previousNode = useRef(null);

  const handleMouseEnter = useCallback(() => {
    setHovering(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHovering(false);
  }, []);

  const customRef = useCallback(
    node => {
      if (previousNode.current?.nodeType === Node.ELEMENT_NODE) {
        previousNode.current.removeEventListener(
          'mouseenter',
          handleMouseEnter,
        );
        previousNode.current.removeEventListener(
          'mouseleave',
          handleMouseLeave,
        );
      }

      if (node?.nodeType === Node.ELEMENT_NODE) {
        node.addEventListener('mouseenter', handleMouseEnter);
        node.addEventListener('mouseleave', handleMouseLeave);
      }

      previousNode.current = node;
    },
    [handleMouseEnter, handleMouseLeave],
  );

  return [customRef, hovering];
}

export default useHover;
