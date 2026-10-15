import { getLocale } from '@/i18n';

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
];

/**
 * "3 days ago" / "3 дня назад", "a year ago"…, or null when it's under
 * `recentSeconds` (callers say "recently": activity is only recorded every few minutes).
 */
export function formatAgo(iso: string, { now = Date.now(), recentSeconds = 0 } = {}) {
  const seconds = Math.max(0, (now - new Date(iso).getTime()) / 1000);
  if (seconds < recentSeconds) return null;

  const format = new Intl.RelativeTimeFormat(getLocale(), { numeric: 'auto' });

  for (const [unit, size] of UNITS) {
    if (seconds >= size) return format.format(-Math.floor(seconds / size), unit);
  }

  return format.format(0, 'minute');
}
