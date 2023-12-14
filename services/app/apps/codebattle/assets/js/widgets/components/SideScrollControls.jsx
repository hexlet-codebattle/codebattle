import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
} from 'react';

import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import cn from 'classnames';
import noop from 'lodash/noop';

const delta = 10;
const commonClassName = 'position-relative overflow-auto';
const commonControllsClassName = 'position-absolute h-100 z-3';

function HorizontalScrollControls({ children, className, onScroll = noop }) {
  const leftButtonRef = useRef(null);
  const scrolledListRef = useRef(null);
  const rightButtonRef = useRef(null);

  const [scrollLeft, setScrollLeft] = useState(0);
  const [showLeftControl, setShowLeftControl] = useState(false);
  const [showRightControl, setShowRightControl] = useState(children.length > 1);

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
    onScroll(event.currentTarget);
    setScrollLeft(event.currentTarget.scrollLeft);
  }, [onScroll, setScrollLeft]);

  const handleScrollItemsRight = useCallback(() => {
    scrolledListRef.current.scrollBy({
      left: scrolledListRef.current.clientWidth,
      behavior: 'smooth',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const leftControlClassName = cn(
    commonControllsClassName,
    'cb-left-scroll-control pr-2 start-0',
    {
      'd-block': showLeftControl,
      'd-none': !showLeftControl,
    },
  );

  const rightControlClassName = cn(
    commonControllsClassName,
    'cb-right-scroll-control pl-2 top-0 end-0',
    {
      'd-block': showRightControl,
      'd-none': !showRightControl,
    },
  );

  return (
    <div className={cn(commonClassName, className)}>
      <div ref={leftButtonRef} className={leftControlClassName}>
        <button type="button" className="btn border-0 p-2 h-100" onClick={handleScrollItemsLeft}>
          <FontAwesomeIcon icon={faChevronLeft} />
        </button>
      </div>
      <div ref={scrolledListRef} onScroll={handleScroll} className="d-flex pb-2 overflow-auto">
        {children}
      </div>
      <div ref={rightButtonRef} className={rightControlClassName}>
        <button type="button" className="btn border-0 p-2 h-100" onClick={handleScrollItemsRight}>
          <FontAwesomeIcon icon={faChevronRight} />
        </button>
      </div>
    </div>
  );
}

export default HorizontalScrollControls;
