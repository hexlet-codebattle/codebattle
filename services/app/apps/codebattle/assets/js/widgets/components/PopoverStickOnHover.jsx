// SEE: https://gist.github.com/lou/571b7c0e7797860d6c555a9fdc0496f9
import React, { useState, useEffect, useRef } from 'react';

import Overlay from 'react-bootstrap/Overlay';
import Popover from 'react-bootstrap/Popover';

function PopoverStickOnHover({
  id,
  delay = 0,
  onMouseEnter = () => { },
  children,
  component,
  placement,
}) {
  const [showPopover, setShowPopover] = useState(false);
  const childNode = useRef(null);
  let setTimeoutConst = null;

  useEffect(() => () => {
    if (setTimeoutConst) {
      clearTimeout(setTimeoutConst);
    }
  });

  const handleMouseEnter = () => {
    setTimeoutConst = setTimeout(() => {
      setShowPopover(true);
      onMouseEnter();
    }, delay);
  };

  const handleMouseLeave = () => {
    clearTimeout(setTimeoutConst);
    setShowPopover(false);
  };

  const displayChild = React.Children.map(children, child => React.cloneElement(child, {
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    ref: node => {
      childNode.current = node;
      const { ref } = child;
      if (typeof ref === 'function') {
        ref(node);
      }
    },
  }))[0];

  return (
    <>
      {displayChild}
      <Overlay
        show={showPopover}
        placement={placement}
        target={childNode}
        shouldUpdatePosition
      >
        <Popover
          className="cb-blur cb-text cb-rounded"
          trigger="click"
          onMouseEnter={() => {
            setShowPopover(true);
          }}
          onMouseLeave={handleMouseLeave}
          id={id}
        >
          {component}
        </Popover>
      </Overlay>
    </>
  );
}

export default PopoverStickOnHover;
