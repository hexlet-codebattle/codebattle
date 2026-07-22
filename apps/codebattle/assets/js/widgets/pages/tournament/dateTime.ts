const DEFAULT_TIMEZONE = 'UTC';

export const getBrowserTimezone = (fallback = DEFAULT_TIMEZONE) => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || fallback;
  } catch (_error) {
    return fallback;
  }
};

export const formatDatetimeLocal = (value: string | undefined, timezone: string) => {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((result, part) => {
      result[part.type] = part.value;
      return result;
    }, {});

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
};
