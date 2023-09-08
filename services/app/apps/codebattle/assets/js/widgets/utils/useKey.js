/* eslint-disable no-nested-ternary */
import { useMemo } from 'react';

import useEvent from './useEvent';

const noop = () => {};

const createKeyPredicate = (keyFilter) =>
  typeof keyFilter === 'function'
    ? keyFilter
    : typeof keyFilter === 'string'
    ? (event) => event.key === keyFilter
    : keyFilter
    ? () => true
    : () => false;

const useKey = (key, fn = noop, opts = {}, deps = [key]) => {
  const { event = 'keydown', options, target } = opts;
  const useMemoHandler = useMemo(() => {
    const predicate = createKeyPredicate(key);
    const handler = (handlerEvent) => {
      if (predicate(handlerEvent)) {
        return fn(handlerEvent);
      }

      return null;
    };
    return handler;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEvent(event, useMemoHandler, options, target);
};
export default useKey;
