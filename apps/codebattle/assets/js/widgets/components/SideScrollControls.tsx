import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
  type UIEvent,
} from 'react';

import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Box, Flex, UnstyledButton } from '@mantine/core';
import noop from 'lodash/noop';

const delta = 10;

interface HorizontalScrollControlsProps {
  children: ReactNode[];
  className?: string;
  onScroll?: (target: EventTarget & HTMLDivElement) => void;
}

function HorizontalScrollControls({
  children,
  className,
  onScroll = noop,
}: HorizontalScrollControlsProps) {
  const leftButtonRef = useRef<HTMLDivElement>(null);
  const scrolledListRef = useRef<HTMLDivElement>(null);
  const rightButtonRef = useRef<HTMLDivElement>(null);

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
    scrolledListRef.current!.scrollBy({
      left: -scrolledListRef.current!.clientWidth,
      behavior: 'smooth',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      onScroll(event.currentTarget);
      setScrollLeft(event.currentTarget.scrollLeft);
    },
    [onScroll, setScrollLeft],
  );

  const handleScrollItemsRight = useCallback(() => {
    scrolledListRef.current!.scrollBy({
      left: scrolledListRef.current!.clientWidth,
      behavior: 'smooth',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Box pos="relative" className={className} style={{ overflow: 'auto' }}>
      <Box
        ref={leftButtonRef}
        pos="absolute"
        h="100%"
        left={0}
        pr="sm"
        display={showLeftControl ? 'block' : 'none'}
        className="cb-left-scroll-control"
        style={{ zIndex: 3 }}
      >
        <UnstyledButton p="sm" h="100%" onClick={handleScrollItemsLeft}>
          <FontAwesomeIcon icon={faChevronLeft} />
        </UnstyledButton>
      </Box>
      <Flex ref={scrolledListRef} onScroll={handleScroll} pb="sm" style={{ overflow: 'auto' }}>
        {children}
      </Flex>
      <Box
        ref={rightButtonRef}
        pos="absolute"
        h="100%"
        top={0}
        right={0}
        pl="sm"
        display={showRightControl ? 'block' : 'none'}
        className="cb-right-scroll-control"
        style={{ zIndex: 3 }}
      >
        <UnstyledButton p="sm" h="100%" onClick={handleScrollItemsRight}>
          <FontAwesomeIcon icon={faChevronRight} />
        </UnstyledButton>
      </Box>
    </Box>
  );
}

export default HorizontalScrollControls;
