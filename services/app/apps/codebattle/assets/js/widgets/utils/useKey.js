/* eslint-disable no-nested-ternary */
import { useMemo } from 'react';
import useEvent from './useEvent';

const noop = () => { };
const createKeyPredicate = keyFilter => (typeof keyFilter === 'function'
    ? keyFilter
    : typeof keyFilter === 'string'
        ? event => event.key === keyFilter
        : keyFilter
            ? () => true
            : () => false);
const useKey = (key, fn = noop, opts = {}, deps = [key]) => {
    const { event = 'keydown', target, options } = opts;
    const useMemoHandler = useMemo(() => {
        const predicate = createKeyPredicate(key);
        // eslint-disable-next-line consistent-return
        const handler = handlerEvent => {
            if (predicate(handlerEvent)) {
                return fn(handlerEvent);
            }
        };
        return handler;
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
    useEvent(event, useMemoHandler, target, options);
};
export default useKey;
