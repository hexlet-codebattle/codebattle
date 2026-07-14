// SEE: https://gist.github.com/lou/571b7c0e7797860d6c555a9fdc0496f9
import React, { useState, useEffect, useRef, type ReactElement, type ReactNode } from 'react';

import Overlay, { type OverlayProps } from 'react-bootstrap/Overlay';
import Popover from 'react-bootstrap/Popover';

interface PopoverStickOnHoverProps {
  id: string;
  delay?: number;
  onMouseEnter?: () => void;
  children: ReactNode;
  component: ReactNode;
  placement?: OverlayProps['placement'];
}

function PopoverStickOnHover({
  id,
  delay = 0,
  onMouseEnter = () => {},
  children,
  component,
  placement,
}: PopoverStickOnHoverProps) {
  const [showPopover, setShowPopover] = useState(false);
  const childNode = useRef<unknown>(null);
  let setTimeoutConst: ReturnType<typeof setTimeout> | null = null;

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
    clearTimeout(setTimeoutConst as ReturnType<typeof setTimeout>);
    setShowPopover(false);
  };

  const displayChild = React.Children.map(children, (child) =>
    React.cloneElement(
      child as ReactElement,
      {
        onMouseEnter: handleMouseEnter,
        onMouseLeave: handleMouseLeave,
        ref: (node: unknown) => {
          childNode.current = node;
          const { ref } = child as ReactElement & { ref?: unknown };
          if (typeof ref === 'function') {
            ref(node);
          }
        },
      } as Partial<unknown>,
    ),
  )?.[0];

  return (
    <>
      {displayChild}
      <Overlay
        show={showPopover}
        placement={placement}
        target={childNode as OverlayProps['target']}
        {...({ shouldUpdatePosition: true } as Record<string, unknown>)}
      >
        <Popover
          className="cb-blur cb-text cb-rounded"
          onMouseEnter={() => {
            setShowPopover(true);
          }}
          onMouseLeave={handleMouseLeave}
          id={id}
          {...({ trigger: 'click' } as Record<string, unknown>)}
        >
          {component}
        </Popover>
      </Overlay>
    </>
  );
}

export default PopoverStickOnHover;
