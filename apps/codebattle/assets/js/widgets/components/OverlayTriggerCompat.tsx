import React, {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type EventHandler,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  type RefAttributes,
  type RefCallback,
  type SyntheticEvent,
} from 'react';

import Overlay, {
  type OverlayChildren,
  type OverlayProps,
  type Placement,
} from 'react-bootstrap/Overlay';

type Trigger = 'click' | 'focus' | 'hover';
type Delay = number | { hide?: number; show?: number };
type TriggerHandler = EventHandler<SyntheticEvent<HTMLElement>>;

interface TriggerHandlers {
  onBlur?: TriggerHandler;
  onClick?: TriggerHandler;
  onFocus?: TriggerHandler;
  onMouseOut?: TriggerHandler;
  onMouseOver?: TriggerHandler;
}

interface TriggerChildProps extends TriggerHandlers {
  ref: RefCallback<HTMLElement>;
}

type TriggerElementProps = HTMLAttributes<HTMLElement> & RefAttributes<HTMLElement>;

interface OverlayTriggerCompatProps extends Omit<
  OverlayProps,
  'children' | 'placement' | 'show' | 'target'
> {
  children: ReactNode | ((props: TriggerChildProps) => ReactNode);
  delay?: Delay;
  overlay: OverlayChildren;
  placement?: Placement;
  show?: boolean;
  trigger?: Trigger | Trigger[];
}

const normalizeDelay = (delay?: Delay) => {
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

const normalizeTriggers = (trigger?: Trigger | Trigger[]) => {
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
}: OverlayTriggerCompatProps) {
  const triggerNodeRef = useRef<HTMLElement | null>(null);
  const showTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  const updateShow = useCallback(
    (nextShow: boolean, timeout: number) => {
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
    },
    [clearTimers, controlled],
  );

  const handleShow = useCallback(() => updateShow(true, delays.show), [delays.show, updateShow]);
  const handleHide = useCallback(() => updateShow(false, delays.hide), [delays.hide, updateShow]);
  const handleToggle = useCallback(() => updateShow(!shouldShow, 0), [shouldShow, updateShow]);

  const childProps: TriggerHandlers = {};

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

  const setRef: RefCallback<HTMLElement> = (node) => {
    triggerNodeRef.current = node;
  };

  const mergeHandlers = (childHandler?: TriggerHandler, triggerHandler?: TriggerHandler) =>
    ((event) => {
      childHandler?.(event);
      triggerHandler?.(event);
    }) satisfies TriggerHandler;

  if (!children) {
    return null;
  }

  const triggerNode =
    typeof children === 'function' ? children({ ...childProps, ref: setRef }) : children;

  if (!isValidElement(triggerNode)) {
    return triggerNode;
  }

  const triggerChild = triggerNode as ReactElement<TriggerElementProps>;
  const isHostElement = typeof triggerChild.type === 'string';
  const wrapperProps: HTMLAttributes<HTMLSpanElement> & RefAttributes<HTMLSpanElement> = {
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
        childProps.onClick?.(event);
      }
    };
  }

  const triggerElement = isHostElement ? (
    cloneElement(triggerChild, {
      ...childProps,
      onClick: mergeHandlers(triggerChild.props.onClick, childProps.onClick),
      onFocus: mergeHandlers(triggerChild.props.onFocus, childProps.onFocus),
      onBlur: mergeHandlers(triggerChild.props.onBlur, childProps.onBlur),
      onMouseOver: mergeHandlers(triggerChild.props.onMouseOver, childProps.onMouseOver),
      onMouseOut: mergeHandlers(triggerChild.props.onMouseOut, childProps.onMouseOut),
      ref: setRef,
    })
  ) : (
    <span {...wrapperProps}>{triggerChild}</span>
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
