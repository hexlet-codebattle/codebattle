import { useLayoutEffect, useRef } from 'react';

/**
 * A ref to the latest `value`, for callbacks registered once (channel listeners, editor actions)
 * that must call the current props. Updated after commit, so read it in callbacks, never in render.
 */
export function useLatest<T>(value: T) {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
}
