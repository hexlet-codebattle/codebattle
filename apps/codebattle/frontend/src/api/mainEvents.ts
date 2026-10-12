import { useEffect, useRef } from 'react';

// The "main" channel is joined once per page (AppLayout, for presence). Pages
// that need its other pushes subscribe here instead of joining it again —
// Phoenix closes a duplicate join of the same topic on one socket.

export const MAIN_RELAYED_EVENTS = ['tournament:activated', 'tournament:canceled'] as const;

export type MainEvent = (typeof MAIN_RELAYED_EVENTS)[number];

type Listener = (payload: any) => void;

const listeners = new Map<MainEvent, Set<Listener>>();

export function emitMainEvent(event: MainEvent, payload: unknown) {
  listeners.get(event)?.forEach((listener) => listener(payload));
}

export function useMainEvent(event: MainEvent, handler: Listener) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const listener: Listener = (payload) => handlerRef.current(payload);
    const set = listeners.get(event) ?? new Set();
    set.add(listener);
    listeners.set(event, set);

    return () => {
      set.delete(listener);
    };
  }, [event]);
}
