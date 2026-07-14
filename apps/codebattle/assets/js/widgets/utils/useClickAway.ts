import { useEffect, useRef, type RefObject } from 'react';

const on = (obj: EventTarget, ...args: Parameters<EventTarget['addEventListener']>) =>
  obj.addEventListener(...args);
const off = (obj: EventTarget, ...args: Parameters<EventTarget['removeEventListener']>) =>
  obj.removeEventListener(...args);

const defaultEvents = ['mousedown', 'touchstart'];
const useClickAway = (
  ref: RefObject<HTMLElement | null>,
  onClickAway: (event: Event) => void,
  events: string[] = defaultEvents,
) => {
  const savedCallback = useRef(onClickAway);
  useEffect(() => {
    savedCallback.current = onClickAway;
  }, [onClickAway]);
  useEffect(() => {
    const handler = (event: Event) => {
      const { current: el } = ref;
      // eslint-disable-next-line no-unused-expressions
      el && !el.contains(event.target as Node) && savedCallback.current(event);
    };
    // eslint-disable-next-line no-restricted-syntax
    for (const eventName of events) {
      on(document, eventName, handler);
    }
    return () => {
      // eslint-disable-next-line no-restricted-syntax
      for (const eventName of events) {
        off(document, eventName, handler);
      }
    };
  }, [events, ref]);
};
export default useClickAway;
