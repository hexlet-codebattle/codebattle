import { ActionIcon, Button, Card, Group, Popover, SimpleGrid, Stack, Text, Title, Tooltip } from '@mantine/core';
import { useInterval } from '@mantine/hooks';
import { IconCalendarUser, IconClockFilled, IconHistory, IconInfoCircle, IconPlus, IconUsers, IconUserStar } from '@tabler/icons-react';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { formatCountdown, formatStartsAt, formatStartsIn, formatTime, msUntil, rankingPoints, tournamentTitle } from '../format';
import { useLobbyStore } from '../store';
import type { LobbyTournament, TournamentState } from '../types';

import { GradeIcon } from './GradeIcon';
import classes from './Tournaments.module.css';

const LIVE_STATES: TournamentState[] = ['waiting_participants', 'active'];

// Shown next to the Live marker, or alone for tournaments that are over (i18n keys).
const STATE_NOTES: Partial<Record<TournamentState, string>> = {
  waiting_participants: 'Registration open',
  active: 'In progress',
  finished: 'Finished',
  canceled: 'Canceled',
};

const DAY = 24 * 60 * 60 * 1000;

/** Re-render every second; only cards that show a countdown use it. */
function useNow(enabled: boolean) {
  const [now, setNow] = useState(() => Date.now());
  const interval = useInterval(() => setNow(Date.now()), 1000);

  useEffect(() => {
    if (!enabled) return undefined;
    interval.start();
    return interval.stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return now;
}

/** The card's second footer line: always exactly one line of timing, so every card has the same height. */
function StatusLine({ tournament }: { tournament: LobbyTournament }) {
  const { t } = useTranslation();
  const startsAt = tournament.starts_at;
  const pending = startsAt != null && ['upcoming', 'waiting_participants'].includes(tournament.state);
  useNow(pending);
  const left = startsAt ? msUntil(startsAt) : 0;
  const counting = pending && left > 0 && left <= DAY;

  // "in 3:04:28" / "через 3:04:28": the clock icon already says it's the start.
  const countdown = counting && (
    <Text span ff="monospace" fw={600} className={classes.accent}>
      {t('in %{time}', { time: formatCountdown(left) })}
    </Text>
  );

  let text: ReactNode;
  if (tournament.state === 'canceled') text = t('Canceled');
  else if (tournament.state === 'finished') text = t('Finished');
  else if (tournament.state === 'active')
    text = startsAt ? t('Started at %{time}', { time: formatTime(startsAt) }) : t('In progress');
  else if (countdown) text = countdown;
  else text = pending && left > 0 ? formatStartsIn(left) : t('Starting soon');

  return (
    <Group gap={6} wrap="nowrap" miw={0}>
      <IconClockFilled size={14} className={counting ? classes.accent : classes.muted} />
      <Text size="xs" c="dimmed" truncate>
        {text}
      </Text>
    </Group>
  );
}

function TournamentCard({ tournament, isAdmin }: { tournament: LobbyTournament; isAdmin: boolean }) {
  const { t } = useTranslation();
  const live = LIVE_STATES.includes(tournament.state);
  const noteKey = STATE_NOTES[tournament.state];
  const note = noteKey && t(noteKey);
  // Open grade = a tournament a user created; season grades have a trophy and ranking points.
  const graded = tournament.grade !== 'open';
  const points = graded ? rankingPoints(tournament.grade) : null;
  const canOpen = tournament.state !== 'upcoming' || isAdmin;

  return (
    <Card padding="sm" h="100%" className={classes.card} data-live={live || undefined} style={{ '--grade-color': `var(--cb-grade-${tournament.grade}, var(--cb-text-muted))` }}>
      <Group wrap="nowrap" gap="sm" align="center">
        {graded && <GradeIcon grade={tournament.grade} size={40} />}
        <Stack gap={2} miw={0} flex={1}>
          <Group gap="xs" wrap="nowrap" justify="space-between">
            <Text fw={700} c="bright" truncate>
              {tournamentTitle(tournament.name, tournament.grade)}
            </Text>
            {(live || tournament.state === 'finished') && (
              <Tooltip label={t('Players: %{count}', { count: tournament.players_count })}>
                <Group gap={4} wrap="nowrap" className={classes.players}>
                  <IconUsers size={14} />
                  <Text size="xs" ff="monospace" fw={600}>
                    {tournament.players_count}
                  </Text>
                </Group>
              </Tooltip>
            )}
          </Group>
          <Group gap={6} wrap="nowrap" miw={0}>
            {live && (
              <span className={classes.live}>
                <span className={classes.liveDot} />
                {t('Live')}
              </span>
            )}
            <Text size="xs" c="dimmed" truncate>
              {live || !tournament.starts_at
                ? note
                : [note, formatStartsAt(tournament.starts_at)].filter(Boolean).join(' · ')}
            </Text>
          </Group>
        </Stack>
      </Group>

      <Card.Section withBorder inheritPadding py="xs" mt="sm">
        <Group justify="space-between" wrap="nowrap" align="center">
          <Stack gap={4} miw={0}>
            {graded ? (
              <Text size="xs" truncate>
                <Text span className={classes.accent} fw={600}>
                  {points}
                </Text>{' '}
                {/* Plural-aware in Russian (Ranking Points_one/_few/_many): 1024 очка, 8 очков. */}
                {t('Ranking Points', { count: points ?? 0 })}
              </Text>
            ) : (
              <Group gap={6} wrap="nowrap">
                <IconUserStar size={14} className={classes.muted} />
                <Text size="xs" c="dimmed" truncate>
                  {t('Custom tournament')}
                </Text>
              </Group>
            )}
            <StatusLine tournament={tournament} />
          </Stack>
          <Group gap={4} wrap="nowrap">
            {canOpen && (
              <Button
                component="a"
                href={`/tournaments/${tournament.id}`}
                size="compact-sm"
                variant={live ? 'filled' : 'default'}
                color={live ? 'green' : undefined}
              >
                {live ? t('Join') : t('Show')}
              </Button>
            )}
            {tournament.description && (
              <Popover width={320} position="bottom-end" withArrow>
                <Popover.Target>
                  <ActionIcon size="sm" aria-label={t('About this tournament')}>
                    <IconInfoCircle size={16} />
                  </ActionIcon>
                </Popover.Target>
                <Popover.Dropdown>
                  <Text size="sm" style={{ whiteSpace: 'pre-line' }}>
                    {tournament.description}
                  </Text>
                </Popover.Dropdown>
              </Popover>
            )}
          </Group>
        </Group>
      </Card.Section>
    </Card>
  );
}

export function Tournaments({ isAdmin }: { isAdmin: boolean }) {
  const { t } = useTranslation();
  const live = useLobbyStore((state) => state.liveTournaments);
  const upcoming = useLobbyStore((state) => state.seasonTournaments);
  // Live first; a tournament can be in both lists right after it starts. Finished
  // and canceled ones are left to the schedule's history.
  const tournaments = useMemo(() => {
    const liveIds = new Set(live.map(({ id }) => id));
    return [...live, ...upcoming.filter(({ id }) => !liveIds.has(id))].filter(
      ({ state }) => state !== 'finished' && state !== 'canceled',
    );
  }, [live, upcoming]);

  return (
    <Stack gap="sm">
      <Stack gap={4} align="center">
        <Title order={3}>{t('Tournaments')}</Title>
        <Group gap={4} justify="center">
          <Button component="a" href="/tournaments#list" variant="subtle" size="compact-sm" leftSection={<IconHistory size={14} />}>
            {t('History')}
          </Button>
          <Button component="a" href="/tournaments#my" variant="subtle" size="compact-sm" leftSection={<IconCalendarUser size={14} />}>
            {t('My Tournaments')}
          </Button>
          <Button component="a" href="/tournaments#create" variant="subtle" size="compact-sm" leftSection={<IconPlus size={14} />}>
            {t('Create')}
          </Button>
        </Group>
      </Stack>
      {tournaments.length === 0 ? (
        <Card>
          <Text c="dimmed" ta="center" py="md">
            {t("Competition hasn't started yet. Check the schedule for upcoming tournaments.")}
          </Text>
        </Card>
      ) : (
        <SimpleGrid cols={{ base: 1, xs: 2, lg: 3 }} spacing="sm">
          {tournaments.map((tournament) => (
            <TournamentCard key={tournament.id} tournament={tournament} isAdmin={isAdmin} />
          ))}
        </SimpleGrid>
      )}
    </Stack>
  );
}
