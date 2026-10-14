import { useState } from 'react';

import { useLatest } from './useLatest';

/**
 * The current pagination page, back on page 1 whenever `resetKey` (the filters, the order) changes.
 * Derived on render, so a filter change never shows a stale out-of-range page first.
 */
export function usePage(resetKey: string) {
  const [state, setState] = useState({ key: resetKey, page: 1 });
  // The committed key, so a page set from a timer after a filter reset sticks.
  const keyRef = useLatest(resetKey);
  const page = state.key === resetKey ? state.page : 1;
  const setPage = (next: number) => setState({ key: keyRef.current, page: next });
  return [page, setPage] as const;
}
