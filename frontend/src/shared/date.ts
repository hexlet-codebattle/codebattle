const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const HAS_ZONE = /([zZ]|[+-]\d\d:?\d\d)$/;

/**
 * Server dates as ISO strings Safari can parse. NaiveDateTimes come without a zone and are UTC;
 * bare dates ("2026-09-21") are calendar days, so they map to local midnight. Safari rejects
 * "2026-09-21Z" and space-separated datetimes that V8 accepts.
 */
export function toIso(value: string) {
  if (DATE_ONLY.test(value)) return `${value}T00:00:00`;

  const iso = value.replace(' ', 'T');

  return HAS_ZONE.test(iso) ? iso : `${iso}Z`;
}

export const parseServerDate = (value: string) => new Date(toIso(value));
