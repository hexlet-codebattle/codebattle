/* eslint-disable no-nested-ternary */
import { useMemo } from 'react';

import useEvent from './useEvent';

type KeyPredicate = (event: KeyboardEvent) => boolean;
type KeyFilter = string | KeyPredicate | boolean | null;
type KeyHandler = (event: KeyboardEvent) => void;

interface UseKeyOptions {
  event?: string;
  target?: any;
  options?: any;
}

const noop: KeyHandler = () => {};

const createKeyPredicate = (keyFilter: KeyFilter): KeyPredicate =>
  typeof keyFilter === 'function'
    ? keyFilter
    : typeof keyFilter === 'string'
      ? (event) => event.key === keyFilter
      : keyFilter
        ? () => true
        : () => false;

const useKey = (
  key: KeyFilter,
  fn: KeyHandler = noop,
  opts: UseKeyOptions = {},
  deps: unknown[] = [key],
) => {
  const { event = 'keydown', target, options } = opts;
  const useMemoHandler = useMemo(() => {
    const predicate = createKeyPredicate(key);
    const handler = (handlerEvent: KeyboardEvent) => {
      if (predicate(handlerEvent)) {
        return fn(handlerEvent);
      }

      return null;
    };
    return handler;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEvent(event, useMemoHandler, target, options);
};
export default useKey;
