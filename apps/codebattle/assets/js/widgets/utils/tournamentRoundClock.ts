import TournamentStates from '../config/tournament';
import TournamentTypes from '../config/tournamentTypes';

// What the round clock is counting down to:
//   next_round — ladder: the next tick opens a new round (always, even an empty one)
//   round_ends — swiss: the current round's games time out
//   break      — a break between rounds; the next round opens when it ends
//   final      — ladder: last round, no more pairing; ends at the final-wave deadline
//   pairing    — the countdown hit zero and the server is opening the round
//   finishing  — the last games are being wrapped up
export type RoundClockPhase =
  | 'next_round'
  | 'round_ends'
  | 'break'
  | 'final'
  | 'pairing'
  | 'finishing';

export interface RoundClockInput {
  type?: string | null;
  state?: string | null;
  breakState?: string | null;
  currentRoundPosition?: number | null;
  roundsLimit?: number | null;
  currentRoundTimeoutSeconds?: number | null;
  breakDurationSeconds?: number | null;
  lastRoundStartedAt?: string | null;
  lastRoundEndedAt?: string | null;
  nextRoundAt?: string | null;
  startsAt?: string | null;
  // Ladder: the planned length of every round in seconds, from the server.
  roundDurations?: number[] | null;
  // serverTime - localTime, recorded when tournament payloads arrive (see tournament slice).
  clockOffsetMs?: number | null;
}

export interface RoundClock {
  phase: RoundClockPhase;
  isLadder: boolean;
  // 1-based number of the current (or just finished, during a break) round.
  roundNumber: number;
  // 0 when the tournament has no round limit.
  totalRounds: number;
  isLastRound: boolean;
  remainingMs: number;
  // Elapsed share of the countdown, 0..1; null when the start is unknown.
  progress: number | null;
  // Seconds between ladder ticks, when known.
  intervalSeconds: number | null;
}

export interface ScheduledRound {
  position: number;
  durationSeconds: number;
  // Planned start on the local clock; null for rounds already played.
  startsAtMs: number | null;
}

export interface RoundSchedule {
  rounds: ScheduledRound[];
  // When the last round ends at the latest, on the local clock.
  finishAtMs: number;
  totalSeconds: number;
}

// Naive datetimes (`last_round_started_at`) are serialized without an offset but are UTC.
export const parseUtcMs = (value?: string | null): number | null => {
  if (!value) return null;

  const normalized = /(Z|[+-]\d\d:?\d\d)$/.test(value) ? value : `${value}Z`;
  const ms = Date.parse(normalized);

  return Number.isNaN(ms) ? null : ms;
};

const positiveSeconds = (value?: number | null) =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

const sumSeconds = (durations: number[], from: number, to: number) =>
  durations.slice(Math.max(from, 0), Math.max(to, 0)).reduce((total, value) => total + value, 0);

export const formatClockDuration = (ms: number) => {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const ss = String(seconds).padStart(2, '0');

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${ss}`;
  }

  return `${minutes}:${ss}`;
};

const buildClock = (
  base: Omit<RoundClock, 'phase' | 'remainingMs' | 'progress'>,
  phase: RoundClockPhase,
  startMs: number | null,
  endMs: number | null,
  nowMs: number,
): RoundClock => {
  const remainingMs = endMs == null ? 0 : Math.max(0, endMs - nowMs);
  const progress =
    startMs != null && endMs != null && endMs > startMs
      ? clamp01((nowMs - startMs) / (endMs - startMs))
      : null;

  return { ...base, phase, remainingMs, progress };
};

export function getRoundClock(tournament: RoundClockInput, localNowMs: number): RoundClock | null {
  if (tournament.state !== TournamentStates.active) return null;

  const nowMs = localNowMs + (tournament.clockOffsetMs ?? 0);
  const isLadder = tournament.type === TournamentTypes.ladder;
  const roundNumber = (tournament.currentRoundPosition ?? 0) + 1;
  const totalRounds =
    tournament.roundsLimit && tournament.roundsLimit > 0 ? tournament.roundsLimit : 0;
  const isLastRound = totalRounds > 0 && roundNumber >= totalRounds;
  const intervalSeconds = isLadder ? positiveSeconds(tournament.currentRoundTimeoutSeconds) : null;
  const base = { isLadder, roundNumber, totalRounds, isLastRound, intervalSeconds };

  const nextRoundAtMs = parseUtcMs(tournament.nextRoundAt);
  const startedAtMs = parseUtcMs(tournament.lastRoundStartedAt);

  if (tournament.breakState === 'on') {
    const endedAtMs = parseUtcMs(tournament.lastRoundEndedAt);
    const breakSeconds = positiveSeconds(tournament.breakDurationSeconds);
    const endMs =
      nextRoundAtMs ?? (endedAtMs != null && breakSeconds ? endedAtMs + breakSeconds * 1000 : null);

    if (endMs != null && nowMs >= endMs) {
      return buildClock(base, 'pairing', null, null, nowMs);
    }

    return buildClock(base, 'break', endedAtMs, endMs, nowMs);
  }

  if (!isLadder) {
    const timeoutSeconds = positiveSeconds(tournament.currentRoundTimeoutSeconds);
    const endMs =
      startedAtMs != null && timeoutSeconds ? startedAtMs + timeoutSeconds * 1000 : null;

    if (endMs != null && nowMs >= endMs) {
      return buildClock(base, 'finishing', null, null, nowMs);
    }

    return buildClock(base, 'round_ends', startedAtMs, endMs, nowMs);
  }

  // Every ladder tick opens a round, so the countdown always ends in round_created (or, for
  // the last round, in the tournament finishing). Past the target we only wait for it.
  const endMs =
    nextRoundAtMs ??
    (startedAtMs != null && intervalSeconds ? startedAtMs + intervalSeconds * 1000 : null);

  if (endMs != null && nowMs >= endMs) {
    return buildClock(base, isLastRound ? 'finishing' : 'pairing', null, null, nowMs);
  }

  return buildClock(base, isLastRound ? 'final' : 'next_round', startedAtMs, endMs, nowMs);
}

// The ladder's planned timetable on the local clock. Every round lasts its planned
// duration and early finishes only pull rounds forward, so each start and the finish are
// "at the latest". Before the start it counts from `startsAt`; once running, from the
// server's next round moment, so it stays exact as the tournament goes on.
export function getRoundSchedule(tournament: RoundClockInput): RoundSchedule | null {
  const durations = tournament.roundDurations;

  if (tournament.type !== TournamentTypes.ladder || !durations?.length) return null;

  let anchorPosition: number;
  let anchorServerMs: number | null;

  if (tournament.state === TournamentStates.active) {
    // nextRoundAt is when the round after the current one opens (in the last round: the
    // finish deadline), and during a break when the break ends and that round opens.
    anchorPosition = (tournament.currentRoundPosition ?? 0) + 1;
    anchorServerMs = parseUtcMs(tournament.nextRoundAt);
  } else if (
    tournament.state === TournamentStates.waitingParticipants ||
    tournament.state === TournamentStates.upcoming
  ) {
    anchorPosition = 0;
    anchorServerMs = parseUtcMs(tournament.startsAt);
  } else {
    return null;
  }

  if (anchorServerMs == null) return null;

  const offsetMs = tournament.clockOffsetMs ?? 0;
  const anchorMs = anchorServerMs - offsetMs;
  const currentStartMs = parseUtcMs(tournament.lastRoundStartedAt);

  const rounds = durations.map((durationSeconds, position) => {
    let startsAtMs: number | null = null;

    if (position >= anchorPosition) {
      startsAtMs = anchorMs + sumSeconds(durations, anchorPosition, position) * 1000;
    } else if (position === anchorPosition - 1 && currentStartMs != null) {
      startsAtMs = currentStartMs - offsetMs;
    }

    return { position, durationSeconds, startsAtMs };
  });

  return {
    rounds,
    finishAtMs: anchorMs + sumSeconds(durations, anchorPosition, durations.length) * 1000,
    totalSeconds: sumSeconds(durations, 0, durations.length),
  };
}
