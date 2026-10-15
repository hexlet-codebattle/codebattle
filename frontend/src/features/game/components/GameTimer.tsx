import { Tooltip } from '@mantine/core';
import { IconClock, IconHourglassHigh } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { formatClockDuration } from '@/features/tournament/clock';
import { parseServerDate } from '@/shared/date';

import { isGameOver } from '../store';
import type { Game } from '../types';
import classes from '../GameRoom.module.css';

const URGENT_MS = 60_000;

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, [active]);
  return now;
}

/** Time left while playing (elapsed when the game has no limit), the duration once it's over. */
export function GameTimer({ game }: { game: Game }) {
  const { t } = useTranslation();
  const over = isGameOver(game.state);
  const playing = game.state === 'playing';
  const now = useNow(playing);

  if (over) {
    // Unknown duration (e.g. the game timed out): nothing worth a pill.
    if (game.duration_sec == null) return null;
    return (
      <Tooltip label={t('Duration')}>
        <span className={classes.timer} data-over>
          <IconClock size={15} />
          {formatClockDuration(game.duration_sec * 1000)}
        </span>
      </Tooltip>
    );
  }

  if (!playing || !game.starts_at) return null;

  const startedMs = parseServerDate(game.starts_at).getTime();
  const limitMs = (game.timeout_seconds ?? 0) * 1000;

  if (!limitMs) {
    return (
      <span className={classes.timer}>
        <IconClock size={15} />
        {formatClockDuration(now - startedMs)}
      </span>
    );
  }

  const remaining = Math.max(0, startedMs + limitMs - now);
  const elapsed = Math.min(1, Math.max(0, (now - startedMs) / limitMs));
  // Green while there is time, yellow for the last 30% (or 3 minutes), red for the last minute.
  const phase = remaining <= URGENT_MS ? 'urgent' : remaining <= Math.max(limitMs * 0.3, 180_000) ? 'warn' : 'ok';

  return (
    <Tooltip label={t('Time left')}>
      <span
        className={classes.timerBar}
        data-phase={phase}
        role="timer"
        aria-label={`${t('Time left')}: ${formatClockDuration(remaining)}`}
      >
        <span className={classes.timerFill} style={{ width: `${elapsed * 100}%` }} />
        <span className={classes.timerLabel}>
          <IconHourglassHigh size={14} />
          {formatClockDuration(remaining)}
        </span>
      </span>
    </Tooltip>
  );
}
