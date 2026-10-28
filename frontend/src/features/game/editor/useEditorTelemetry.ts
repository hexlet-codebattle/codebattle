import { useCallback, useEffect, useRef } from 'react';

import { useLatest } from '@/shared/useLatest';

import type { EditorTelemetry } from './CodeEditor';
import { addEvent, EVENT_LIMIT, finalize, WINDOW_MS } from './telemetry';

type Send = (summary: NonNullable<ReturnType<typeof finalize>> & { collector_session: string; batch_sequence: number }, lang: string) => void;

/**
 * Collects my editor's telemetry into windows (≤ 10 s / ≤ 100 events, one language each)
 * and sends each finished window. `startedAtMs` anchors the offsets (the game start).
 */
export function useEditorTelemetry({ enabled, lang, startedAtMs, send }: { enabled: boolean; lang: string; startedAtMs: number; send: Send }) {
  const windowRef = useRef<ReturnType<typeof addEvent> | null>(null);
  const collectorSession = useRef(crypto.randomUUID());
  const sequence = useRef(0);
  const timer = useRef<number | null>(null);
  const sendRef = useLatest(send);

  const flush = useCallback(() => {
    if (timer.current != null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    const summary = finalize(windowRef.current);
    windowRef.current = null;
    if (summary) sendRef.current({ ...summary, collector_session: collectorSession.current, batch_sequence: sequence.current++ }, summary.lang_slug);
  }, [sendRef]);

  const add = useCallback(
    (event: EditorTelemetry) => {
      // A new language starts a new window.
      if (windowRef.current && windowRef.current.lang_slug !== lang) flush();
      windowRef.current = addEvent(windowRef.current, { ...event, lang_slug: lang, offset_ms: Math.max(0, Date.now() - startedAtMs) });
      if (windowRef.current.event_count >= EVENT_LIMIT) flush();
      else if (timer.current == null) timer.current = window.setTimeout(flush, WINDOW_MS);
    },
    [lang, startedAtMs, flush],
  );
  const record = useCallback(
    (event: EditorTelemetry) => {
      if (enabled) add(event);
    },
    [enabled, add],
  );

  // Leaving the game (another tab or window) while playing, counted on the way back. Declared
  // before the flush below: an absence still open when the game ends lands in the last window.
  const awaySince = useRef<number | null>(null);
  // Not gated on `enabled`: the cleanup below runs once the game is over.
  const addRef = useLatest(add);
  useEffect(() => {
    if (!enabled) return undefined;
    const leave = () => {
      if (awaySince.current == null) awaySince.current = Date.now();
    };
    const back = () => {
      if (awaySince.current == null) return;
      const away = Date.now() - awaySince.current;
      awaySince.current = null;
      addRef.current({ type: 'focus_return', away_ms: away });
    };
    const onVisibility = () => (document.hidden ? leave() : back());
    if (document.hidden || !document.hasFocus()) leave();
    window.addEventListener('blur', leave);
    window.addEventListener('focus', back);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('blur', leave);
      window.removeEventListener('focus', back);
      document.removeEventListener('visibilitychange', onVisibility);
      back();
    };
  }, [enabled, addRef]);

  // Stopped (game over, editor locked) or gone: send what we have.
  useEffect(() => {
    if (!enabled) flush();
    return flush;
  }, [enabled, flush]);

  return record;
}
