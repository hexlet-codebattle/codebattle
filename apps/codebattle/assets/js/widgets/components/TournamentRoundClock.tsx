import React, { memo, useEffect, useState, type ReactNode } from 'react';

import cn from 'classnames';
import i18next from 'i18next';

import {
  formatClockDuration,
  getRoundClock,
  getRoundSchedule,
  type RoundClock,
  type RoundClockInput,
  type RoundClockPhase,
  type RoundSchedule,
} from '../utils/tournamentRoundClock';

const TICK_MS = 250;
const URGENT_MS = 10_000;
// Beyond this many rounds the segments get too thin to read; the counter is enough.
const MAX_TRACK_SEGMENTS = 60;
const RING_RADIUS = 26;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const countdownPhases: RoundClockPhase[] = ['next_round', 'round_ends', 'break', 'final'];

function useNow(enabled: boolean) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled) return undefined;

    const interval = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(interval);
  }, [enabled]);

  return now;
}

const getEyebrow = (clock: RoundClock) => {
  switch (clock.phase) {
    case 'next_round':
      return i18next.t('Next round');
    case 'round_ends':
      return i18next.t('Round in progress');
    case 'break':
      return i18next.t('Break');
    case 'final':
      return i18next.t('Final round');
    case 'pairing':
      return i18next.t('Pairing players');
    default:
      return i18next.t('Wrapping up');
  }
};

const getTitle = (clock: RoundClock) => {
  switch (clock.phase) {
    case 'next_round':
    case 'break':
      return i18next.t('Round %{round} starts in', { round: clock.roundNumber + 1 });
    case 'round_ends':
      return i18next.t('Round %{round} ends in', { round: clock.roundNumber });
    case 'final':
      return i18next.t('Final games end in');
    case 'pairing':
      return i18next.t('Matching opponents…');
    default:
      return i18next.t('Waiting for the last games');
  }
};

const getHint = (clock: RoundClock) => {
  switch (clock.phase) {
    // Ladder rounds run on a fixed schedule: a round opens on time even if nobody is free.
    case 'next_round':
      return i18next.t('Players still in a game skip the round');
    case 'break':
      return i18next.t('Take a breath — new pairs are made when the break ends');
    case 'final':
      return i18next.t('No new pairs — results are final when these games end');
    default:
      return null;
  }
};

export const formatClockTime = (ms: number) =>
  new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

interface ClockRingProps {
  clock: RoundClock;
}

function ClockRing({ clock }: ClockRingProps) {
  const isCountdown = countdownPhases.includes(clock.phase);
  const hasProgress = isCountdown && clock.progress != null;
  // The ring drains as time passes: full at the start, empty when the countdown hits zero.
  const dashOffset = hasProgress ? RING_CIRCUMFERENCE * (clock.progress as number) : 0;

  return (
    <div className="cb-round-clock-ring">
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <circle className="cb-round-clock-ring-track" cx="32" cy="32" r={RING_RADIUS} />
        <circle
          className={cn('cb-round-clock-ring-value', {
            'cb-round-clock-ring-spin': !hasProgress,
          })}
          cx="32"
          cy="32"
          r={RING_RADIUS}
          strokeDasharray={
            hasProgress
              ? RING_CIRCUMFERENCE
              : `${RING_CIRCUMFERENCE * 0.25} ${RING_CIRCUMFERENCE * 0.75}`
          }
          strokeDashoffset={dashOffset}
        />
      </svg>
      <span className="cb-round-clock-ring-label">
        {isCountdown && clock.remainingMs > 0 ? formatClockDuration(clock.remainingMs) : '…'}
      </span>
    </div>
  );
}

interface RoundTrackProps {
  totalRounds: number;
  // Index of the current round; -1 before the start.
  currentIndex: number;
  // During a break the current round is over and the next one is counting down.
  roundIsOver?: boolean;
  // Elapsed share of the counting segment (current round, or the next one in a break).
  progress?: number | null;
  // When known, segments are sized by their planned length and show their start time.
  schedule?: RoundSchedule | null;
  // A round to outline, e.g. the one the viewed game belongs to.
  markedIndex?: number | null;
}

// A timeline of all rounds: played | current | upcoming.
export function RoundTrack({
  totalRounds,
  currentIndex,
  roundIsOver = false,
  progress = null,
  schedule = null,
  markedIndex = null,
}: RoundTrackProps) {
  if (totalRounds <= 0 || totalRounds > MAX_TRACK_SEGMENTS) return null;

  const countingIndex = roundIsOver ? currentIndex + 1 : currentIndex;

  return (
    <div
      className="cb-round-track"
      role="img"
      aria-label={
        currentIndex >= 0
          ? i18next.t('Round %{round} of %{total}', { round: currentIndex + 1, total: totalRounds })
          : i18next.t('Rounds: %{count}', { count: totalRounds })
      }
    >
      {Array.from({ length: totalRounds }, (_, index) => {
        const planned = schedule?.rounds[index];
        const isDone = index < currentIndex || (index === currentIndex && roundIsOver);
        const isCounting = index === countingIndex && currentIndex >= 0;
        const title =
          planned?.startsAtMs != null
            ? i18next.t('Round %{round} · %{time}', {
                round: index + 1,
                time: formatClockTime(planned.startsAtMs),
              })
            : i18next.t('Round %{round}', { round: index + 1 });

        return (
          <span
            // Segments are positional and never reorder.
            // eslint-disable-next-line react/no-array-index-key
            key={index}
            title={title}
            style={planned ? { flexGrow: planned.durationSeconds } : undefined}
            className={cn('cb-round-track-segment', {
              'cb-round-track-segment-done': isDone,
              'cb-round-track-segment-current': isCounting && !roundIsOver,
              'cb-round-track-segment-next': isCounting && roundIsOver,
              'cb-round-track-segment-marked': index === markedIndex,
            })}
          >
            {isCounting && progress != null && (
              <span
                className="cb-round-track-fill"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            )}
          </span>
        );
      })}
    </div>
  );
}

interface TournamentRoundClockProps {
  tournament: RoundClockInput;
  // Game page: the round of the viewed game. A game runs on its own clock, so the tournament
  // may already be rounds ahead; the counter then shows the game's round, not the current one.
  gameRoundPosition?: number | null;
  gameRoundLabel?: string;
  // No red last-seconds alert, e.g. while the viewer plays a game on its own timer.
  calm?: boolean;
  // A denser layout for tight panels: smaller ring, and `children` (a one-line note) take
  // the place of the hint instead of a separate footer.
  compact?: boolean;
  className?: string;
  children?: ReactNode;
}

function TournamentRoundClock({
  tournament,
  gameRoundPosition = null,
  gameRoundLabel,
  calm = false,
  compact = false,
  className,
  children,
}: TournamentRoundClockProps) {
  const isActive = tournament.state === 'active';
  const now = useNow(isActive);
  const clock = getRoundClock(tournament, now);

  if (!clock) return null;

  const schedule = getRoundSchedule(tournament);
  const isUrgent =
    !calm &&
    countdownPhases.includes(clock.phase) &&
    clock.remainingMs > 0 &&
    clock.remainingMs <= URGENT_MS;
  const rootClassName = cn(
    'cb-round-clock',
    `cb-round-clock-phase-${clock.phase.replace('_', '-')}`,
    { 'cb-round-clock-urgent': isUrgent, 'cb-round-clock-compact': compact },
    className,
  );
  const counterRound = gameRoundPosition == null ? clock.roundNumber : gameRoundPosition + 1;
  const roundCounter =
    clock.totalRounds > 0 ? `${counterRound}/${clock.totalRounds}` : `${counterRound}`;
  const hint = compact ? null : getHint(clock);
  const roundsLeft = clock.totalRounds - clock.roundNumber;

  return (
    <div className={rootClassName} data-testid="tournament-round-clock">
      <div className="cb-round-clock-main">
        <ClockRing clock={clock} />
        <div className="cb-round-clock-text">
          <span className="cb-round-clock-eyebrow">{getEyebrow(clock)}</span>
          <span className="cb-round-clock-title" aria-live="polite">
            {getTitle(clock)}
          </span>
          {hint && <span className="cb-round-clock-hint">{hint}</span>}
          {compact && children}
        </div>
        <div className="cb-round-clock-counter">
          <span className="cb-round-clock-counter-value">{roundCounter}</span>
          <span className="cb-round-clock-counter-label">
            {gameRoundPosition == null
              ? i18next.t('Round')
              : (gameRoundLabel ?? i18next.t('Game round'))}
          </span>
        </div>
      </div>
      <RoundTrack
        totalRounds={clock.totalRounds}
        currentIndex={clock.roundNumber - 1}
        roundIsOver={clock.phase === 'break' || clock.phase === 'pairing'}
        progress={clock.progress}
        schedule={schedule}
        markedIndex={gameRoundPosition}
      />
      {schedule && (
        <div className="cb-round-clock-schedule">
          <span>
            {roundsLeft > 0
              ? i18next.t('Rounds left: %{count}', { count: roundsLeft })
              : i18next.t('Last round')}
          </span>
          <span>
            {i18next.t('Ends by %{time}', { time: formatClockTime(schedule.finishAtMs) })}
          </span>
        </div>
      )}
      {!compact && children}
    </div>
  );
}

export default memo(TournamentRoundClock);
