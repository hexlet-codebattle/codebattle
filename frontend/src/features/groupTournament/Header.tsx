import { Anchor, Badge, Group, Title } from '@mantine/core';
import { IconClock, IconHourglassHigh, IconSettings, IconUsersGroup } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { formatClockDuration } from '@/features/tournament/clock';
import { parseServerDate } from '@/shared/date';

import type { GroupTournament } from './types';
import { isSeedRound } from './utils';
import classes from './GroupTournament.module.css';

const SUPPORT_URL = 'https://t.me/+Z0_UGvNt_yE4ODcy';

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, [active]);
  return now;
}

type Tone = 'calm' | 'warn' | 'urgent' | 'info';

const toneFor = (remainingMs: number): Tone => (remainingMs <= 60_000 ? 'urgent' : remainingMs <= 300_000 ? 'warn' : 'calm');

/** Countdown to the start, then to the round's end (or the break's end), then "Running solutions…". */
function Clock({ status, tournament }: { status: string; tournament: GroupTournament }) {
  const { t } = useTranslation();
  const waiting = status === 'waiting_participants';
  const active = status === 'active' && tournament.state === 'active';
  const now = useNow(waiting || active);

  if (waiting) {
    const startsAt = tournament.starts_at ? parseServerDate(tournament.starts_at).getTime() : null;
    const remaining = startsAt == null ? 0 : startsAt - now;
    return remaining > 0 ? (
      <span className={classes.clock} data-tone={toneFor(remaining)}>
        <IconHourglassHigh size={16} />
        {formatClockDuration(remaining)}
      </span>
    ) : (
      <span className={classes.clock} data-tone="info" data-small>
        {t('Tournament will start soon')}
      </span>
    );
  }

  if (!active) return null;

  const startedAt = tournament.last_round_started_at || tournament.started_at;
  if (!startedAt) return null;

  const startMs = parseServerDate(startedAt).getTime();
  // During the break the server moves the round's start into the future.
  if (startMs > now) {
    return (
      <span className={classes.clock} data-tone="info">
        <IconClock size={16} />
        {`${t('Break')}: ${formatClockDuration(startMs - now)}`}
      </span>
    );
  }

  const timeout = (isSeedRound(tournament) && tournament.seed_round_timeout_seconds) || tournament.round_timeout_seconds;
  if (!timeout) return null;

  const remaining = startMs + timeout * 1000 - now;
  return remaining > 0 ? (
    <span className={classes.clock} data-tone={toneFor(remaining)}>
      <IconHourglassHigh size={16} />
      {formatClockDuration(remaining)}
    </span>
  ) : (
    <span className={classes.clock} data-tone="info" data-small>
      {t('Running solutions…')}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const [color, label] = (() => {
    switch (status) {
      case 'active':
        return ['green', t('Active')];
      case 'finished':
        return ['gray', t('Finished')];
      case 'canceled':
        return ['red', t('Canceled')];
      default:
        return ['yellow', t('Waiting for start')];
    }
  })();
  return (
    <Badge variant="light" color={color} size="sm">
      {label}
    </Badge>
  );
}

interface HeaderProps {
  name: string;
  status: string;
  tournament: GroupTournament | null;
  /** Links to the admin page. */
  isAdmin: boolean;
}

/** Name and state on the left, the clock in the middle, round counter and links on the right. */
export function Header({ name, status, tournament, isAdmin }: HeaderProps) {
  const { t } = useTranslation();
  const timed = tournament && !tournament.is_infinite && tournament.type !== 'seed_only';
  const round = tournament?.current_round_position ?? 0;
  const rounds = tournament?.rounds_count ?? 0;

  return (
    <div className={classes.header}>
      <Group gap="sm" wrap="nowrap" miw={0} className={classes.headerSide}>
        <IconUsersGroup size={22} stroke={1.5} style={{ flex: 'none' }} />
        <Title order={4} lh={1.2} lineClamp={1}>
          {name || t('Group Tournament')}
        </Title>
        <StatusBadge status={status} />
      </Group>
      <div className={classes.headerClock}>{timed && tournament && <Clock status={status} tournament={tournament} />}</div>
      <Group gap="md" wrap="nowrap" justify="flex-end" className={classes.headerSide}>
        {status === 'active' && rounds > 1 && round > 0 && (
          <span className={classes.roundCounter}>{t('Round %{round} of %{total}', { round, total: rounds })}</span>
        )}
        <Anchor href={SUPPORT_URL} target="_blank" rel="noopener noreferrer" size="sm" c="dimmed">
          {t('Support')}
        </Anchor>
        {isAdmin && tournament && (
          <Anchor href={`/admin/group_tournaments/${tournament.id}`} size="sm" c="dimmed" aria-label={t('Admin panel')} title={t('Admin panel')}>
            <IconSettings size={18} style={{ verticalAlign: 'middle' }} />
          </Anchor>
        )}
      </Group>
    </div>
  );
}
