import { useEffect, useRef } from 'react';

const on = (obj, ...args) => obj.addEventListener(...args);
const off = (obj, ...args) => obj.removeEventListener(...args);

const defaultEvents = ['mousedown', 'touchstart'];
const useClickAway = (ref, onClickAway, events = defaultEvents) => {
  const savedCallback = useRef(onClickAway);
  useEffect(() => {
    savedCallback.current = onClickAway;
  }, [onClickAway]);
  useEffect(() => {
    const handler = (event) => {
      const { current: el } = ref;
      // eslint-disable-next-line no-unused-expressions
      el && !el.contains(event.target) && savedCallback.current(event);
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
