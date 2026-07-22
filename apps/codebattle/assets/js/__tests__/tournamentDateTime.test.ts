import { formatDatetimeLocal, getBrowserTimezone } from '../widgets/pages/tournament/dateTime';

describe('tournament date and time helpers', () => {
  test('uses the browser timezone', () => {
    expect(getBrowserTimezone('UTC')).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
  });

  test('formats a stored instant for a datetime-local input in the user timezone', () => {
    const startsAt = '2026-07-21T12:30:00Z';

    expect(formatDatetimeLocal(startsAt, 'America/New_York')).toBe('2026-07-21T08:30');
    expect(formatDatetimeLocal(startsAt, 'Asia/Tokyo')).toBe('2026-07-21T21:30');
  });

  test('returns an empty value for a missing or invalid instant', () => {
    expect(formatDatetimeLocal(undefined, 'UTC')).toBe('');
    expect(formatDatetimeLocal('not-a-date', 'UTC')).toBe('');
  });
});
