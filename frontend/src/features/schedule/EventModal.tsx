import { ActionIcon, Badge, Button, Group, Modal, SimpleGrid, Stack, Text, Tooltip } from '@mantine/core';
import { IconChevronLeft, IconChevronRight, IconExternalLink } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { GradeIcon } from '@/features/lobby/components/GradeIcon';
import { LEAGUE_GRADES } from '@/features/lobby/components/LeagueBanner';
import { formatCountdown, formatStartsIn, gradeLabel, tournamentTitle } from '@/features/lobby/format';
import { getLocale } from '@/i18n';
import { useNow } from '@/shared/useNow';
import { useSharedProps } from '@/shared/useSharedProps';

import type { ScheduleEvent } from './api';
import classes from './Schedule.module.css';

export function StateBadge({ state }: { state: string }) {
  const { t } = useTranslation();
  const [color, label] =
    state === 'active'
      ? ['green', t('Live')]
      : state === 'finished'
        ? ['gray', t('Finished')]
        : state === 'waiting_participants'
          ? ['blue', t('Registration')]
          : ['gray', t('Upcoming')];

  return (
    <Badge size="xs" variant="light" color={color}>
      {label}
    </Badge>
  );
}

/** "in 2 days" → live countdown in the last 24h → "Live" / "Finished". */
function StartsIn({ event }: { event: ScheduleEvent }) {
  const { t } = useTranslation();
  const now = useNow(1000);
  const ms = event.start.getTime() - now;

  if (event.tournament.state === 'finished') return <Text fw={700}>{t('Finished')}</Text>;
  if (event.tournament.state === 'active' || ms <= 0) return <Text fw={700} c="green">{t('Live')}</Text>;

  return (
    <Text fw={700} ff="monospace">
      {ms < 24 * 3600 * 1000 ? formatCountdown(ms) : formatStartsIn(ms)}
    </Text>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Stack gap={0}>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      {typeof children === 'string' || typeof children === 'number' ? <Text fw={600}>{children}</Text> : children}
    </Stack>
  );
}

interface EventModalProps {
  /** Events in view, in time order, for previous/next. */
  events: ScheduleEvent[];
  selected: ScheduleEvent | null;
  onSelect: (event: ScheduleEvent | null) => void;
}

export function EventModal({ events, selected, onSelect }: EventModalProps) {
  const { t } = useTranslation();
  const { current_user: me } = useSharedProps();

  if (!selected) return <Modal opened={false} onClose={() => onSelect(null)} />;

  const { tournament, start, end } = selected;
  const index = events.findIndex((event) => event.tournament.id === tournament.id);
  const previous = index > 0 ? events[index - 1] : null;
  const next = index >= 0 && index < events.length - 1 ? events[index + 1] : null;
  const league = tournament.grade !== 'open';
  const points = LEAGUE_GRADES.find((row) => row.grade === tournament.grade);
  // Pre-created league slots open once they become a real tournament.
  const canOpen = tournament.state !== 'upcoming' || Boolean(me.is_admin);

  const date = new Intl.DateTimeFormat(getLocale(), { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(start);
  const time = (value: Date) => new Intl.DateTimeFormat(getLocale(), { hour: '2-digit', minute: '2-digit', hour12: false }).format(value);

  return (
    <Modal
      opened
      onClose={() => onSelect(null)}
      size="lg"
      title={
        <Group gap="sm" wrap="nowrap">
          {league && <GradeIcon grade={tournament.grade} size={36} />}
          <Stack gap={0}>
            <Group gap={8}>
              <Text fw={700} fz="lg" c="bright">
                {tournamentTitle(tournament.name, tournament.grade)}
              </Text>
              <StateBadge state={tournament.state} />
            </Group>
            <Text size="xs" c="dimmed">
              {league ? t('Codebattle League · %{grade}', { grade: gradeLabel(tournament.grade) }) : t('Custom tournament')}
            </Text>
          </Stack>
        </Group>
      }
    >
      <Stack gap="md">
        <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="md" verticalSpacing="sm">
          <Fact label={t('Date')}>{date}</Fact>
          <Fact label={t('Time')}>{`${time(start)} – ${time(end)}`}</Fact>
          <Fact label={t('Starts in')}>
            <StartsIn event={selected} />
          </Fact>
          <Fact label={t('Players')}>
            {tournament.players_limit
              ? `${tournament.players_count ?? 0} / ${tournament.players_limit}`
              : String(tournament.players_count ?? 0)}
          </Fact>
          {tournament.rounds_limit != null && <Fact label={t('Rounds')}>{tournament.rounds_limit}</Fact>}
          {league && points && <Fact label={t('1st place')}>{t('%{points} points', { points: points.points[0] })}</Fact>}
        </SimpleGrid>

        {league && points ? (
          <Stack gap={4}>
            <Text size="xs" c="dimmed" fw={600} tt="uppercase" lts="0.05em">
              {t('Season points by place')}
            </Text>
            <Group gap={4}>
              {points.points.map((value, place) => (
                <Badge key={place} variant="default" size="md" ff="monospace" tt="none">
                  {`#${place + 1} · ${value}`}
                </Badge>
              ))}
            </Group>
            <Text size="xs" c="dimmed">
              {t('Every other finisher gets 2 points.')}
            </Text>
          </Stack>
        ) : (
          tournament.description && (
            <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
              {tournament.description}
            </Text>
          )
        )}

        {league && (
          <Stack gap={2}>
            {LEAGUE_GRADES.map((row) => (
              <div key={row.grade} className={classes.pointsRow} data-selected={row.grade === tournament.grade || undefined}>
                <Group gap={6} wrap="nowrap">
                  <GradeIcon grade={row.grade} size={14} />
                  {gradeLabel(row.grade)}
                </Group>
                <Text span ff="monospace" fz="xs">
                  [{row.points.join(', ')}]
                </Text>
              </div>
            ))}
          </Stack>
        )}

        <Group justify="space-between">
          <Group gap={4}>
            <Tooltip label={previous ? tournamentTitle(previous.tournament.name, previous.tournament.grade) : t('Previous')}>
              <ActionIcon variant="default" disabled={!previous} onClick={() => previous && onSelect(previous)} aria-label={t('Previous')}>
                <IconChevronLeft size={16} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label={next ? tournamentTitle(next.tournament.name, next.tournament.grade) : t('Next')}>
              <ActionIcon variant="default" disabled={!next} onClick={() => next && onSelect(next)} aria-label={t('Next')}>
                <IconChevronRight size={16} />
              </ActionIcon>
            </Tooltip>
            {index >= 0 && (
              <Text size="xs" c="dimmed" ml={4}>
                {t('%{index} of %{count}', { index: index + 1, count: events.length })}
              </Text>
            )}
          </Group>
          <Tooltip label={t('Opens when registration starts')} disabled={canOpen}>
            <Button
              component="a"
              href={canOpen ? `/tournaments/${tournament.id}` : undefined}
              data-disabled={!canOpen || undefined}
              onClick={(event) => !canOpen && event.preventDefault()}
              variant="filled"
              rightSection={<IconExternalLink size={14} />}
            >
              {t('Open Tournament')}
            </Button>
          </Tooltip>
        </Group>
      </Stack>
    </Modal>
  );
}
