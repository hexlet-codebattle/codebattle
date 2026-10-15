import { useEffect, useState } from 'react';

/** The current time (ms), re-read every `intervalMs` so countdowns and "today" stay fresh. */
export function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return now;
}
