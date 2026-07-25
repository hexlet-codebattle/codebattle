const DEFAULT_TIMEZONE = 'UTC';

export const getBrowserTimezone = (fallback = DEFAULT_TIMEZONE) => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || fallback;
  } catch (_error) {
    return fallback;
  }
};

export const formatStartsAt = (value: string | undefined, userTimezone = DEFAULT_TIMEZONE) => {
  if (!value) {
    return 'none';
  }

  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: userTimezone || DEFAULT_TIMEZONE,
    timeZoneName: 'short',
  };

  try {
    return new Intl.DateTimeFormat(undefined, options).format(new Date(value));
  } catch (_error) {
    return new Intl.DateTimeFormat(undefined, { ...options, timeZone: DEFAULT_TIMEZONE }).format(
      new Date(value),
    );
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
