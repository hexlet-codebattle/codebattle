import { useCallback, useEffect, useRef } from 'react';

import { useLatest } from '@/shared/useLatest';

import type { EditorTelemetry } from './CodeEditor';
import { addEvent, EVENT_LIMIT, finalize, WINDOW_MS } from './telemetry';

type Send = (summary: NonNullable<ReturnType<typeof finalize>>, lang: string) => void;

/**
 * Collects my editor's telemetry into windows (≤ 10 s / ≤ 100 events, one language each)
 * and sends each finished window. `startedAtMs` anchors the offsets (the game start).
 */
export function useEditorTelemetry({ enabled, lang, startedAtMs, send }: { enabled: boolean; lang: string; startedAtMs: number; send: Send }) {
  const windowRef = useRef<ReturnType<typeof addEvent> | null>(null);
  const timer = useRef<number | null>(null);
  const sendRef = useLatest(send);

  const flush = useCallback(() => {
    if (timer.current != null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    const summary = finalize(windowRef.current);
    windowRef.current = null;
    if (summary) sendRef.current(summary, summary.lang_slug);
  }, [sendRef]);

  // Stopped (game over, editor locked) or gone: send what we have.
  useEffect(() => {
    if (!enabled) flush();
    return flush;
  }, [enabled, flush]);

  return useCallback(
    (event: EditorTelemetry) => {
      if (!enabled) return;
      // A new language starts a new window.
      if (windowRef.current && windowRef.current.lang_slug !== lang) flush();
      windowRef.current = addEvent(windowRef.current, { ...event, lang_slug: lang, offset_ms: Math.max(0, Date.now() - startedAtMs) });
      if (windowRef.current.event_count >= EVENT_LIMIT) flush();
      else if (timer.current == null) timer.current = window.setTimeout(flush, WINDOW_MS);
    },
    [enabled, lang, startedAtMs, flush],
  );
}
