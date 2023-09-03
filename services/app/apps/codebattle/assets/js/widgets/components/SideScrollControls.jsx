import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
} from 'react';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';

const delta = 10;

function HorizontalScrollControls({ children }) {
  const leftButtonRef = useRef(null);
  const scrolledListRef = useRef(null);
  const rightButtonRef = useRef(null);

  const [scrollLeft, setScrollLeft] = useState(0);
  const [showLeftControl, setShowLeftControl] = useState(false);
  const [showRightControl, setShowRightControl] = useState(children.length > 1);

  const className = 'position-absolute align-items-center h-100 p-2';

  useEffect(() => {
    if (!scrolledListRef.current || scrolledListRef.current.clientWidth === 0) {
      return;
    }

    if (scrollLeft > delta && !showLeftControl) {
      setShowLeftControl(true);
    }
    if (scrollLeft <= delta && showLeftControl) {
      setShowLeftControl(false);
    }

    const scrollRight = scrollLeft + scrolledListRef.current.clientWidth;

    if (scrolledListRef.current.scrollWidth - scrollRight > delta && !showRightControl) {
      setShowRightControl(true);
    }

    if (scrolledListRef.current.scrollWidth - scrollRight <= delta && showRightControl) {
      setShowRightControl(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollLeft]);

  const handleScrollItemsLeft = useCallback(() => {
    scrolledListRef.current.scrollBy({
      left: -scrolledListRef.current.clientWidth,
      behavior: 'smooth',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScroll = useCallback(event => {
    setScrollLeft(event.currentTarget.scrollLeft);
  }, [setScrollLeft]);

  const handleScrollItemsRight = useCallback(() => {
    scrolledListRef.current.scrollBy({
      left: scrolledListRef.current.clientWidth,
      behavior: 'smooth',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div
        ref={leftButtonRef}
        style={{ left: 0, zIndex: 1000 }}
        className={cn(
          className,
          'cb-left-scroll-control',
          {
            'd-flex': showLeftControl,
            'd-none': !showLeftControl,
          },
        )}
      >
        <button
          type="button"
          className="btn border-0 rounded-circle p-2"
          onClick={handleScrollItemsLeft}
        >
          <FontAwesomeIcon icon="chevron-left" />
        </button>
      </div>
      <div
        ref={scrolledListRef}
        onScroll={handleScroll}
        className="d-flex pb-2 overflow-auto"
      >
        {children}
      </div>
      <div
        ref={rightButtonRef}
        style={{ right: 0, zIndex: 1000 }}
        className={cn(
          className,
          'cb-right-scroll-control',
          {
            'd-flex': showRightControl,
            'd-none': !showRightControl,
          },
        )}
      >
        <button
          type="button"
          className="btn border-0 rounded-circle p-2"
          onClick={handleScrollItemsRight}
        >
          <FontAwesomeIcon
            icon="chevron-right"
          />
        </button>
      </div>
    </>
  );
}

export default HorizontalScrollControls;
