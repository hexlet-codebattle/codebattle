import {
  ActionIcon,
  Badge,
  Button,
  Card,
  Center,
  Group,
  Loader,
  Popover,
  SegmentedControl,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconCalendarMonth, IconChevronLeft, IconChevronRight, IconList, IconUsers } from '@tabler/icons-react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { type CSSProperties, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { GradeIcon } from '@/features/lobby/components/GradeIcon';
import { gradeLabel, tournamentTitle } from '@/features/lobby/format';
import { getLocale } from '@/i18n';
import { useNow } from '@/shared/useNow';

import {
  addDays,
  dayKey,
  fetchSchedule,
  monthGrid,
  sameDay,
  type ScheduleEvent,
  type ScheduleScope,
  scheduleEvents,
  startOfDay,
  weekStart,
} from './api';
import { EventModal, StateBadge } from './EventModal';
import classes from './Schedule.module.css';

const MAX_IN_CELL = 3;

type View = 'month' | 'agenda';

const timeOf = (date: Date) => new Intl.DateTimeFormat(getLocale(), { hour: '2-digit', minute: '2-digit', hour12: false }).format(date);

function EventChip({ event, onSelect }: { event: ScheduleEvent; onSelect: (event: ScheduleEvent) => void }) {
  const { tournament } = event;

  return (
    <button
      type="button"
      className={classes.event}
      data-state={tournament.state}
      style={{ '--grade': `var(--cb-grade-${tournament.grade}, var(--cb-text-muted))` } as CSSProperties}
      onClick={() => onSelect(event)}
      title={tournamentTitle(tournament.name, tournament.grade)}
    >
      {tournament.state === 'active' && <span className={classes.live} />}
      <span className={classes.eventTime}>{timeOf(event.start)}</span>
      <span className={classes.eventName}>{tournamentTitle(tournament.name, tournament.grade)}</span>
    </button>
  );
}

function DayCell({
  day,
  today,
  events,
  outside,
  onSelect,
}: {
  day: Date;
  today: Date;
  events: ScheduleEvent[];
  outside: boolean;
  onSelect: (event: ScheduleEvent) => void;
}) {
  const { t } = useTranslation();
  const weekend = day.getDay() === 0 || day.getDay() === 6;
  const hidden = events.length - MAX_IN_CELL;

  return (
    <div
      className={classes.day}
      data-outside={outside || undefined}
      data-weekend={weekend || undefined}
      data-today={sameDay(day, today) || undefined}
    >
      <span className={classes.dayNumber}>{day.getDate()}</span>
      {events.slice(0, hidden > 0 ? MAX_IN_CELL - 1 : MAX_IN_CELL).map((event) => (
        <EventChip key={event.tournament.id} event={event} onSelect={onSelect} />
      ))}
      {hidden > 0 && (
        <Popover width={260} position="bottom" shadow="md" withArrow>
          <Popover.Target>
            <button type="button" className={classes.more}>
              {t('+%{count} more', { count: hidden + 1 })}
            </button>
          </Popover.Target>
          <Popover.Dropdown p={6}>
            <Stack gap={3}>
              <Text size="xs" c="dimmed" fw={600} px={4}>
                {new Intl.DateTimeFormat(getLocale(), { weekday: 'long', month: 'long', day: 'numeric' }).format(day)}
              </Text>
              {events.map((event) => (
                <EventChip key={event.tournament.id} event={event} onSelect={onSelect} />
              ))}
            </Stack>
          </Popover.Dropdown>
        </Popover>
      )}
    </div>
  );
}

function Agenda({ days, today, onSelect }: { days: [Date, ScheduleEvent[]][]; today: Date; onSelect: (event: ScheduleEvent) => void }) {
  const { t } = useTranslation();
  const format = new Intl.DateTimeFormat(getLocale(), { weekday: 'short', month: 'short', day: 'numeric' });

  if (days.length === 0) {
    return (
      <Text c="dimmed" ta="center" py="xl">
        {t('There are no tournaments in this range.')}
      </Text>
    );
  }

  return (
    <div>
      {days.map(([day, events]) => (
        <div key={dayKey(day)} className={classes.agendaDay}>
          <Text fw={700} c={sameDay(day, today) ? 'green' : 'bright'} pt={6}>
            {sameDay(day, today) ? t('Today') : format.format(day)}
          </Text>
          <Stack gap={2}>
            {events.map((event) => {
              const { tournament } = event;
              return (
                <button
                  key={tournament.id}
                  type="button"
                  className={`${classes.row} ${classes.agendaEvent}`}
                  data-state={tournament.state}
                  onClick={() => onSelect(event)}
                >
                  <Text className={classes.eventRange} ff="monospace" size="sm" c="dimmed" w={96} style={{ flex: 'none' }}>
                    {timeOf(event.start)}–{timeOf(event.end)}
                  </Text>
                  {tournament.grade !== 'open' ? (
                    <GradeIcon grade={tournament.grade} size={20} />
                  ) : (
                    <span style={{ width: 20, flex: 'none' }} />
                  )}
                  <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
                    <Text size="sm" fw={600} c="bright" truncate>
                      {tournamentTitle(tournament.name, tournament.grade)}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {tournament.grade === 'open' ? t('Custom tournament') : gradeLabel(tournament.grade)}
                    </Text>
                  </Stack>
                  <Group gap="xs" className={classes.rowMeta}>
                    {(tournament.players_count ?? 0) > 0 && (
                      <Group gap={4} c="dimmed" wrap="nowrap">
                        <IconUsers size={14} />
                        <Text size="xs" ff="monospace">
                          {tournament.players_count}
                        </Text>
                      </Group>
                    )}
                    <StateBadge state={tournament.state} />
                  </Group>
                </button>
              );
            })}
          </Stack>
        </div>
      ))}
    </div>
  );
}

/** Month grid / agenda of tournaments for one scope (league, mine, all). */
export function Calendar({ scope }: { scope: ScheduleScope }) {
  const { t } = useTranslation();
  const locale = getLocale();
  const today = new Date(useNow(60_000));
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const [month, setMonth] = useState(thisMonth);
  const compact = useMediaQuery('(max-width: 48em)');
  const [chosenView, setView] = useState<View | null>(null);
  const view = chosenView ?? (compact ? 'agenda' : 'month');
  const [selected, setSelected] = useState<ScheduleEvent | null>(null);

  const days = useMemo(() => monthGrid(month, weekStart(locale)), [month, locale]);
  // The grid shows parts of the neighbouring months; load all of it.
  const from = days[0];
  const to = addDays(days[days.length - 1], 1);

  const { data, isPending, isError, isPlaceholderData } = useQuery({
    queryKey: ['schedule', from.toISOString(), to.toISOString()],
    queryFn: () => fetchSchedule(from, to),
    placeholderData: keepPreviousData,
  });

  const events = useMemo(() => (data ? scheduleEvents(data, scope) : []), [data, scope]);
  const byDay = useMemo(() => {
    const map = new Map<string, ScheduleEvent[]>();
    for (const event of events) {
      const key = dayKey(event.start);
      map.set(key, [...(map.get(key) ?? []), event]);
    }
    return map;
  }, [events]);

  const inMonth = events.filter((event) => event.start.getMonth() === month.getMonth());
  const agendaDays = [...new Set(inMonth.map((event) => dayKey(event.start)))].map(
    (key) => [startOfDay(byDay.get(key)![0].start), byDay.get(key)!] as [Date, ScheduleEvent[]],
  );

  const shift = (delta: number) => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  const title = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(month);
  const weekdays = days.slice(0, 7).map((day) => new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(day));
  const isCurrentMonth = sameDay(month, thisMonth);

  return (
    <Card padding="md">
      <Group justify="space-between" mb="md" gap="sm">
        <Group gap="xs">
          <ActionIcon variant="default" onClick={() => shift(-1)} aria-label={t('Back')}>
            <IconChevronLeft size={16} />
          </ActionIcon>
          <ActionIcon variant="default" onClick={() => shift(1)} aria-label={t('Next')}>
            <IconChevronRight size={16} />
          </ActionIcon>
          <Button
            size="xs"
            variant="default"
            disabled={isCurrentMonth}
            onClick={() => setMonth(thisMonth)}
          >
            {t('Today')}
          </Button>
          <Title order={4} tt="capitalize" ml={4}>
            {title}
          </Title>
          {(isPending || isPlaceholderData) && <Loader size={14} />}
        </Group>
        <Group gap="sm">
          <Badge variant="default" size="lg" tt="none" fw={500}>
            {t('%{count} tournaments', { count: inMonth.length })}
          </Badge>
          <SegmentedControl
            size="xs"
            value={view}
            onChange={(value) => setView(value as View)}
            data={[
              {
                value: 'month',
                label: (
                  <Center style={{ gap: 6 }}>
                    <IconCalendarMonth size={14} />
                    {t('Month')}
                  </Center>
                ),
              },
              {
                value: 'agenda',
                label: (
                  <Center style={{ gap: 6 }}>
                    <IconList size={14} />
                    {t('Agenda')}
                  </Center>
                ),
              },
            ]}
          />
        </Group>
      </Group>

      {isError ? (
        <Text c="dimmed" ta="center" py="xl">
          {t("Couldn't load the schedule.")}
        </Text>
      ) : view === 'month' ? (
        <div className={classes.grid} style={{ opacity: isPlaceholderData ? 0.6 : 1 }}>
          {weekdays.map((name) => (
            <div key={name} className={classes.weekday}>
              {name}
            </div>
          ))}
          {days.map((day) => (
            <DayCell
              key={dayKey(day)}
              day={day}
              today={today}
              outside={day.getMonth() !== month.getMonth()}
              events={byDay.get(dayKey(day)) ?? []}
              onSelect={setSelected}
            />
          ))}
        </div>
      ) : isPending ? (
        <Center py="xl">
          <Loader size="sm" />
        </Center>
      ) : (
        <Agenda days={agendaDays} today={today} onSelect={setSelected} />
      )}

      <EventModal events={events} selected={selected} onSelect={setSelected} />
    </Card>
  );
}
