import { Card, Group, Loader, Select, Stack, Text, Title } from '@mantine/core';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { type CSSProperties, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getLocale } from '@/i18n';

import { fetchActivity } from '../api';

import classes from './Heatmap.module.css';

const FIRST_YEAR = 2017;
const DAY_MS = 24 * 3600 * 1000;

// All calendar maths in UTC: the API sends plain YYYY-MM-DD dates.
const parseDay = (date: string) => Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10));
const dayKey = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** 0 none, 1 = 1–2 games, 2 = 3–4, 3 = 5+ (legacy thresholds). */
const level = (count: number) => (count >= 5 ? 3 : count >= 3 ? 2 : count >= 1 ? 1 : 0);

interface Cell {
  key: string;
  count: number;
  inRange: boolean;
}

function buildWeeks(start: string, end: string, counts: Map<string, number>) {
  const first = parseDay(start);
  const last = parseDay(end);
  // Columns are Sunday-first weeks, like GitHub.
  const gridStart = first - new Date(first).getUTCDay() * DAY_MS;
  const weeks: Cell[][] = [];

  for (let day = gridStart; day <= last; day += 7 * DAY_MS) {
    weeks.push(
      Array.from({ length: 7 }, (_, offset) => {
        const ms = day + offset * DAY_MS;
        const key = dayKey(ms);
        return { key, count: counts.get(key) ?? 0, inRange: ms >= first && ms <= last };
      }),
    );
  }

  return weeks;
}

export function Heatmap({ userId }: { userId: string }) {
  const { t } = useTranslation();
  const [year, setYear] = useState<number | null>(null);
  const { data, isPending, isFetching, isError } = useQuery({
    queryKey: ['activity', userId, year],
    queryFn: () => fetchActivity(userId, year),
    placeholderData: keepPreviousData,
  });

  const locale = getLocale();
  const formats = useMemo(
    () => ({
      month: new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' }),
      weekday: new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }),
      day: new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }),
    }),
    [locale],
  );

  const view = useMemo(() => {
    if (!data) return null;

    const counts = new Map(data.activities.map(({ date, count }) => [date, count]));
    const weeks = buildWeeks(data.meta.start_date, data.meta.end_date, counts);
    const total = data.activities.reduce((sum, { count }) => sum + count, 0);
    // Month label above the first column that contains the 1st of a month.
    const months = weeks.map((week) => {
      const firstOfMonth = week.find((cell) => cell.inRange && cell.key.endsWith('-01'));
      return firstOfMonth ? formats.month.format(parseDay(firstOfMonth.key)) : '';
    });

    return { weeks, total, months };
  }, [data, formats]);

  const [currentYear] = useState(() => new Date().getUTCFullYear());
  const yearOptions = [
    { value: '', label: t('Last 365 days') },
    ...Array.from({ length: currentYear - FIRST_YEAR + 1 }, (_, i) => String(currentYear - i)).map((value) => ({
      value,
      label: value,
    })),
  ];

  const tooltip = (cell: Cell) =>
    cell.count
      ? t('%{count} games on %{date}', { count: cell.count, date: formats.day.format(parseDay(cell.key)) })
      : t('No games on %{date}', { date: formats.day.format(parseDay(cell.key)) });

  return (
    <Card>
      <Group justify="space-between" mb="sm" wrap="nowrap">
        <Stack gap={0}>
          <Title order={5}>{t('Activity')}</Title>
          {view && (
            <Text size="xs" c="dimmed">
              {year
                ? t('%{count} games in %{year}', { count: view.total, year })
                : t('%{count} games in the last 365 days', { count: view.total })}
            </Text>
          )}
        </Stack>
        <Group gap="xs" wrap="nowrap">
          {isFetching && !isPending && <Loader size={14} />}
          <Select
            size="xs"
            w={150}
            allowDeselect={false}
            value={year ? String(year) : ''}
            onChange={(value) => setYear(value ? Number(value) : null)}
            data={yearOptions}
            aria-label={t('Activity period')}
          />
        </Group>
      </Group>

      {isError ? (
        <Text size="sm" c="dimmed">
          {t("Couldn't load activity.")}
        </Text>
      ) : !view ? (
        <Group justify="center" py="xl">
          <Loader size="sm" />
        </Group>
      ) : (
        <div className={classes.scroll}>
          <div className={classes.calendar} style={{ '--weeks': view.weeks.length } as CSSProperties}>
            <div className={classes.weekdays}>
              {/* Mon / Wed / Fri, like GitHub (rows are Sunday-first). */}
              {[1, 3, 5].map((dow) => (
                <span key={dow} style={{ gridRow: dow + 1 }}>
                  {formats.weekday.format(Date.UTC(2023, 0, 1 + dow))}
                </span>
              ))}
            </div>
            <div className={classes.months}>
              {view.months.map((label, i) => (
                // eslint-disable-next-line react/no-array-index-key
                <span key={i}>{label}</span>
              ))}
            </div>
            <div className={classes.grid}>
              {view.weeks.flat().map((cell) => (
                <span
                  key={cell.key}
                  className={classes.cell}
                  data-level={cell.inRange ? level(cell.count) : undefined}
                  data-out={cell.inRange ? undefined : true}
                  title={cell.inRange ? tooltip(cell) : undefined}
                />
              ))}
            </div>
          </div>
          <Group gap={4} justify="flex-end" mt={6}>
            <Text fz={11} c="dimmed">
              {t('Less')}
            </Text>
            {[0, 1, 2, 3].map((value) => (
              <span key={value} className={classes.cell} data-level={value} />
            ))}
            <Text fz={11} c="dimmed">
              {t('More')}
            </Text>
          </Group>
        </div>
      )}
    </Card>
  );
}
