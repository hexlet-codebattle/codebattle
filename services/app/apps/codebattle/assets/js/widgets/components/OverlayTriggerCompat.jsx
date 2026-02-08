import React, {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import Overlay from 'react-bootstrap/Overlay';

const normalizeDelay = (delay) => {
  if (delay == null) {
    return { show: 0, hide: 0 };
  }

  if (typeof delay === 'number') {
    return { show: delay, hide: delay };
  }

  return {
    show: delay.show || 0,
    hide: delay.hide || 0,
  };
};

const normalizeTriggers = (trigger) => {
  if (!trigger) {
    return [];
  }

  return Array.isArray(trigger) ? trigger : [trigger];
};

function OverlayTriggerCompat({
  children,
  trigger = ['hover', 'focus'],
  placement = 'right',
  overlay,
  show,
  delay,
  ...overlayProps
}) {
  const triggerNodeRef = useRef(null);
  const showTimeoutRef = useRef(null);
  const hideTimeoutRef = useRef(null);
  const [internalShow, setInternalShow] = useState(false);

  const controlled = show !== undefined;
  const shouldShow = controlled ? show : internalShow;
  const triggers = useMemo(() => normalizeTriggers(trigger), [trigger]);
  const delays = useMemo(() => normalizeDelay(delay), [delay]);

  const clearTimers = useCallback(() => {
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = null;
    }

    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const updateShow = useCallback((nextShow, timeout) => {
    if (controlled) {
      return;
    }

    const delayMs = Number(timeout) || 0;
    clearTimers();

    if (delayMs === 0) {
      setInternalShow(nextShow);
      return;
    }

    const timeoutId = setTimeout(() => {
      setInternalShow(nextShow);
    }, delayMs);

    if (nextShow) {
      showTimeoutRef.current = timeoutId;
    } else {
      hideTimeoutRef.current = timeoutId;
    }
  }, [clearTimers, controlled]);

  const handleShow = useCallback(() => updateShow(true, delays.show), [delays.show, updateShow]);
  const handleHide = useCallback(() => updateShow(false, delays.hide), [delays.hide, updateShow]);
  const handleToggle = useCallback(() => updateShow(!shouldShow, 0), [shouldShow, updateShow]);

  const childProps = {};

  if (triggers.includes('click')) {
    childProps.onClick = handleToggle;
  }

  if (triggers.includes('focus')) {
    childProps.onFocus = handleShow;
    childProps.onBlur = handleHide;
  }

  if (triggers.includes('hover')) {
    childProps.onMouseOver = handleShow;
    childProps.onMouseOut = handleHide;
  }

  const setRef = (node) => {
    triggerNodeRef.current = node;
  };

  const mergeHandlers = (childHandler, triggerHandler) => (event) => {
    if (typeof childHandler === 'function') {
      childHandler(event);
    }

    if (typeof triggerHandler === 'function') {
      triggerHandler(event);
    }
  };

  if (!children) {
    return null;
  }

  const triggerChild = typeof children === 'function'
    ? children({ ...childProps, ref: setRef })
    : children;

  if (!isValidElement(triggerChild)) {
    return triggerChild;
  }

  const isHostElement = typeof triggerChild.type === 'string';
  const wrapperProps = {
    ref: setRef,
    onClick: childProps.onClick,
    onFocus: childProps.onFocus,
    onBlur: childProps.onBlur,
    onMouseOver: childProps.onMouseOver,
    onMouseOut: childProps.onMouseOut,
    className: 'd-inline-flex align-items-center',
  };

  if (childProps.onClick) {
    wrapperProps.role = 'button';
    wrapperProps.tabIndex = 0;
    wrapperProps.onKeyDown = (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        childProps.onClick(event);
      }
    };
  }

  const triggerElement = isHostElement
    ? cloneElement(triggerChild, {
      ...childProps,
      onClick: mergeHandlers(triggerChild.props.onClick, childProps.onClick),
      onFocus: mergeHandlers(triggerChild.props.onFocus, childProps.onFocus),
      onBlur: mergeHandlers(triggerChild.props.onBlur, childProps.onBlur),
      onMouseOver: mergeHandlers(triggerChild.props.onMouseOver, childProps.onMouseOver),
      onMouseOut: mergeHandlers(triggerChild.props.onMouseOut, childProps.onMouseOut),
      ref: setRef,
    })
    : (
      <span {...wrapperProps}>
        {triggerChild}
      </span>
    );

  return (
    <>
      {triggerElement}
      <Overlay
        show={Boolean(shouldShow)}
        placement={placement}
        target={triggerNodeRef.current}
        {...overlayProps}
      >
        {overlay}
      </Overlay>
    </>
  );
}

export default OverlayTriggerCompat;
