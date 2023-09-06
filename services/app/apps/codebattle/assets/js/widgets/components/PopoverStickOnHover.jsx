// SEE: https://gist.github.com/lou/571b7c0e7797860d6c555a9fdc0496f9
import React, { useState, useEffect, useRef } from 'react';

import PropTypes from 'prop-types';
import Overlay from 'react-bootstrap/Overlay';
import Popover from 'react-bootstrap/Popover';

function PopoverStickOnHover({
  id,
  delay,
  onMouseEnter,
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

PopoverStickOnHover.propTypes = {
  id: PropTypes.string.isRequired,
  children: PropTypes.element.isRequired,
  delay: PropTypes.number,
  onMouseEnter: PropTypes.func,
  component: PropTypes.node.isRequired,
  placement: PropTypes.string.isRequired,
};

PopoverStickOnHover.defaultProps = {
  delay: 0,
  onMouseEnter: () => {},
};

export default PopoverStickOnHover;
