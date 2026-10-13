import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { t as translate } from '@/i18n';

import {
  formatClockDuration,
  getRoundClock,
  getRoundSchedule,
  type RoundClock as Clock,
  type RoundClockPhase,
  type RoundSchedule,
} from '../clock';
import { useTournamentStore } from '../store';
import type { Tournament } from '../types';
import type { RoundSolves } from '../useRoundSolves';

import classes from './RoundClock.module.css';

const TICK_MS = 250;
const URGENT_MS = 10_000;
// Beyond this many rounds the segments get too thin to read; the counter is enough.
const MAX_TRACK_SEGMENTS = 60;
const RING_RADIUS = 26;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const COUNTDOWN_PHASES: RoundClockPhase[] = ['next_round', 'round_ends', 'break', 'final'];

function useNow(enabled: boolean) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled) return undefined;
    const interval = window.setInterval(() => setNow(Date.now()), TICK_MS);
    return () => window.clearInterval(interval);
  }, [enabled]);

  return now;
}

export const formatClockTime = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const EYEBROWS: Record<RoundClockPhase, string> = {
  next_round: 'Next round',
  round_ends: 'Round in progress',
  break: 'Break',
  final: 'Final round',
  pairing: 'Pairing players',
  finishing: 'Wrapping up',
};

function title(clock: Clock) {
  switch (clock.phase) {
    case 'next_round':
    case 'break':
      return translate('Round %{round} starts in', { round: clock.roundNumber + 1 });
    case 'round_ends':
      return translate('Round %{round} ends in', { round: clock.roundNumber });
    case 'final':
      return translate('Final games end in');
    case 'pairing':
      return translate('Matching opponents…');
    default:
      return translate('Waiting for the last games');
  }
}

function hint(clock: Clock) {
  switch (clock.phase) {
    // Ladder rounds run on a fixed schedule: a round opens on time even if nobody is free.
    case 'next_round':
      return translate('Players still in a game skip the round');
    case 'break':
      return translate('Take a breath — new pairs are made when the break ends');
    case 'final':
      return translate('No new pairs — results are final when these games end');
    default:
      return null;
  }
}

function ClockRing({ clock }: { clock: Clock }) {
  const isCountdown = COUNTDOWN_PHASES.includes(clock.phase);
  const hasProgress = isCountdown && clock.progress != null;
  // The ring drains as time passes: full at the start, empty when the countdown hits zero.
  const dashOffset = hasProgress ? RING_CIRCUMFERENCE * (clock.progress as number) : 0;

  return (
    <div className={classes.ring}>
      <svg viewBox="0 0 64 64" aria-hidden>
        <circle className={classes.ringTrack} cx="32" cy="32" r={RING_RADIUS} />
        <circle
          className={`${classes.ringValue} ${hasProgress ? '' : classes.ringSpin}`}
          cx="32"
          cy="32"
          r={RING_RADIUS}
          strokeDasharray={hasProgress ? RING_CIRCUMFERENCE : `${RING_CIRCUMFERENCE * 0.25} ${RING_CIRCUMFERENCE * 0.75}`}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <span className={classes.ringLabel}>
        {isCountdown && clock.remainingMs > 0 ? formatClockDuration(clock.remainingMs) : '…'}
      </span>
    </div>
  );
}

interface RoundTrackProps {
  totalRounds: number;
  /** Index of the current round; -1 before the start. */
  currentIndex: number;
  /** During a break the current round is over and the next one is counting down. */
  roundIsOver?: boolean;
  /** Elapsed share of the counting segment. */
  progress?: number | null;
  /** When known, segments are sized by their planned length and show their start time. */
  schedule?: RoundSchedule | null;
  /** A round to outline, e.g. the viewer's round. */
  markedIndex?: number | null;
  /** Per round: players who solved its task out of those who played it. */
  solves?: Record<number, RoundSolves>;
}

// Labels under the segments stay readable up to this many rounds; beyond, tooltips only.
const MAX_LABELLED_ROUNDS = 24;

/** A timeline of all rounds: played | current | upcoming. */
export function RoundTrack({
  totalRounds,
  currentIndex,
  roundIsOver = false,
  progress = null,
  schedule = null,
  markedIndex = null,
  solves,
}: RoundTrackProps) {
  const { t } = useTranslation();
  if (totalRounds <= 0 || totalRounds > MAX_TRACK_SEGMENTS) return null;

  const countingIndex = roundIsOver ? currentIndex + 1 : currentIndex;

  const labelled = Boolean(solves) && totalRounds <= MAX_LABELLED_ROUNDS;

  const track = (
    <div
      className={classes.track}
      role="img"
      aria-label={
        currentIndex >= 0
          ? t('Round %{round} of %{total}', { round: currentIndex + 1, total: totalRounds })
          : t('Rounds: %{count}', { count: totalRounds })
      }
    >
      {Array.from({ length: totalRounds }, (_, index) => {
        const planned = schedule?.rounds[index];
        const isDone = index < currentIndex || (index === currentIndex && roundIsOver);
        const isCounting = index === countingIndex && currentIndex >= 0;
        const solved = solves?.[index];
        const label = [
          planned?.startsAtMs != null
            ? t('Round %{round} · %{time}', { round: index + 1, time: formatClockTime(planned.startsAtMs) })
            : t('Round %{round}', { round: index + 1 }),
          solved ? t('solved %{solved} of %{players}', { solved: solved.solved, players: solved.players }) : null,
        ]
          .filter(Boolean)
          .join(' · ');

        return (
          <span
            // Segments are positional and never reorder.
            // eslint-disable-next-line react/no-array-index-key
            key={index}
            title={label}
            style={planned ? { flexGrow: planned.durationSeconds } : undefined}
            className={classes.segment}
            data-done={isDone || undefined}
            data-current={(isCounting && !roundIsOver) || undefined}
            data-next={(isCounting && roundIsOver) || undefined}
            data-marked={index === markedIndex || undefined}
          >
            {isCounting && progress != null && <span className={classes.fill} style={{ width: `${Math.round(progress * 100)}%` }} />}
          </span>
        );
      })}
    </div>
  );

  if (!labelled) return track;

  return (
    <div className={classes.trackWrap}>
      {track}
      <div className={classes.trackLabels} aria-hidden>
        {Array.from({ length: totalRounds }, (_, index) => {
          const solved = solves?.[index];
          const planned = schedule?.rounds[index];
          return (
            // eslint-disable-next-line react/no-array-index-key
            <span
              key={index}
              className={classes.trackLabel}
              style={planned ? { flexGrow: planned.durationSeconds } : undefined}
              data-current={index === (roundIsOver ? currentIndex + 1 : currentIndex) || undefined}
            >
              {solved ? `${solved.solved}/${solved.players}` : ''}
            </span>
          );
        })}
      </div>
    </div>
  );
}

interface RoundClockProps {
  tournament: Tournament;
  /** The viewer's round (outlined on the track, shown in the counter as "Your round"). */
  playerRoundPosition?: number | null;
  /** A denser layout for tight panels. */
  compact?: boolean;
  /** Sits inside another card (the tournament hero). */
  embedded?: boolean;
  /** Per-round solve counts shown under the track. */
  solves?: Record<number, RoundSolves>;
  /** A one-line note about the viewer (e.g. how their game relates to the next round). */
  children?: ReactNode;
}

/** The legacy TournamentRoundClock: what the tournament is counting down to, and where it is. */
export function RoundClock({
  tournament,
  playerRoundPosition = null,
  compact = false,
  embedded = false,
  solves,
  children,
}: RoundClockProps) {
  const { t } = useTranslation();
  const offset = useTournamentStore((state) => state.clockOffsetMs);
  const now = useNow(tournament.state === 'active');
  const clock = getRoundClock(tournament, now, offset);

  if (!clock) return null;

  const schedule = getRoundSchedule(tournament, offset);
  const urgent = COUNTDOWN_PHASES.includes(clock.phase) && clock.remainingMs > 0 && clock.remainingMs <= URGENT_MS;
  const counterRound = playerRoundPosition == null ? clock.roundNumber : playerRoundPosition + 1;
  const roundsLeft = clock.totalRounds - clock.roundNumber;
  const clockHint = compact ? null : hint(clock);

  return (
    <div
      className={classes.clock}
      data-phase={clock.phase}
      data-urgent={urgent || undefined}
      data-compact={compact || undefined}
      data-embedded={embedded || undefined}
    >
      <div className={classes.main}>
        <ClockRing clock={clock} />
        <div className={classes.text}>
          <span className={classes.eyebrow}>{t(EYEBROWS[clock.phase])}</span>
          <span className={classes.title} aria-live="polite">
            {title(clock)}
          </span>
          {clockHint && <span className={classes.hint}>{clockHint}</span>}
          {children}
        </div>
        <div className={classes.counter}>
          <span className={classes.counterValue}>
            {clock.totalRounds > 0 ? `${counterRound}/${clock.totalRounds}` : counterRound}
          </span>
          <span className={classes.counterLabel}>{playerRoundPosition == null ? t('Round') : t('Your round')}</span>
        </div>
      </div>
      <RoundTrack
        totalRounds={clock.totalRounds}
        currentIndex={clock.roundNumber - 1}
        roundIsOver={clock.phase === 'break' || clock.phase === 'pairing'}
        progress={clock.progress}
        schedule={schedule}
        markedIndex={playerRoundPosition}
        solves={solves}
      />
      {schedule && (
        <div className={classes.schedule}>
          <span>{roundsLeft > 0 ? t('Rounds left: %{count}', { count: roundsLeft }) : t('Last round')}</span>
          <span>{t('Ends by %{time}', { time: formatClockTime(schedule.finishAtMs) })}</span>
        </div>
      )}
    </div>
  );
}

/** Ladder before the start: the planned rounds and when it ends at the latest. */
export function SchedulePreview({ tournament, embedded = false }: { tournament: Tournament; embedded?: boolean }) {
  const { t } = useTranslation();
  const offset = useTournamentStore((state) => state.clockOffsetMs);
  const schedule = getRoundSchedule(tournament, offset);
  if (!schedule) return null;

  const first = schedule.rounds[0]?.startsAtMs;

  return (
    <div className={classes.clock} data-preview data-embedded={embedded || undefined}>
      <div className={classes.text}>
        <span className={classes.eyebrow}>{t('Schedule')}</span>
        <span className={classes.title}>{t('%{count} rounds', { count: schedule.rounds.length })}</span>
      </div>
      <RoundTrack totalRounds={schedule.rounds.length} currentIndex={-1} schedule={schedule} />
      <div className={classes.schedule}>
        {first != null && <span>{t('Starts at %{time}', { time: formatClockTime(first) })}</span>}
        <span>{t('Ends by %{time}', { time: formatClockTime(schedule.finishAtMs) })}</span>
      </div>
    </div>
  );
}
