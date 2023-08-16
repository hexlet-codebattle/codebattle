import { useEffect } from 'react';

const isClient = typeof window === 'object';
const defaultTarget = isClient ? window : null;
const isListenerType1 = target => !!target.addEventListener;
const isListenerType2 = target => !!target.on;
const useEvent = (name, handler, target = defaultTarget, options) => {
    useEffect(() => {
        if (!handler) {
            return;
        }
        if (!target) {
            return;
        }
        if (isListenerType1(target)) {
            target.addEventListener(name, handler, options);
        } else if (isListenerType2(target)) {
            target.on(name, handler, options);
        }
        // eslint-disable-next-line consistent-return
        return () => {
            if (isListenerType1(target)) {
                target?.removeEventListener(name, handler, options);
            } else if (isListenerType2(target)) {
                target.off(name, handler, options);
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [name, handler, target, JSON.stringify(options)]);
};
export default useEvent;
