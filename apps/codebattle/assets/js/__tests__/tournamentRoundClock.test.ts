import { actions as tournamentActions } from '../widgets/slices/tournament';
import {
  formatClockDuration,
  getRoundClock,
  getRoundSchedule,
  parseUtcMs,
  type RoundClockInput,
} from '../widgets/utils/tournamentRoundClock';

const T0 = Date.parse('2026-10-11T12:00:00Z');
const at = (seconds: number) => T0 + seconds * 1000;
const iso = (seconds: number) => new Date(at(seconds)).toISOString();
// Naive datetimes come from the server without an offset.
const naive = (seconds: number) => iso(seconds).replace(/\.\d+Z$/, '');

const ladder = (overrides: Partial<RoundClockInput> = {}): RoundClockInput => ({
  type: 'ladder',
  state: 'active',
  breakState: 'off',
  currentRoundPosition: 2,
  roundsLimit: 10,
  currentRoundTimeoutSeconds: 90,
  breakDurationSeconds: 30,
  lastRoundStartedAt: naive(0),
  lastRoundEndedAt: null,
  nextRoundAt: iso(90),
  ...overrides,
});

describe('parseUtcMs', () => {
  test('treats naive datetimes as UTC', () => {
    expect(parseUtcMs('2026-10-11T12:00:00')).toBe(T0);
    expect(parseUtcMs('2026-10-11T12:00:00Z')).toBe(T0);
    expect(parseUtcMs('2026-10-11T14:00:00+02:00')).toBe(T0);
  });

  test('returns null for missing or invalid values', () => {
    expect(parseUtcMs(null)).toBeNull();
    expect(parseUtcMs('nope')).toBeNull();
  });
});

describe('formatClockDuration', () => {
  test('formats minutes and hours, rounding up partial seconds', () => {
    expect(formatClockDuration(0)).toBe('0:00');
    expect(formatClockDuration(4_200)).toBe('0:05');
    expect(formatClockDuration(90_000)).toBe('1:30');
    expect(formatClockDuration(3_725_000)).toBe('1:02:05');
  });
});

describe('getRoundClock', () => {
  test('is null unless the tournament is active', () => {
    expect(getRoundClock(ladder({ state: 'finished' }), at(10))).toBeNull();
    expect(getRoundClock(ladder({ state: 'waiting_participants' }), at(10))).toBeNull();
  });

  test('ladder counts down to the server-armed next tick', () => {
    const clock = getRoundClock(ladder(), at(30))!;

    expect(clock.phase).toBe('next_round');
    expect(clock.roundNumber).toBe(3);
    expect(clock.totalRounds).toBe(10);
    expect(clock.remainingMs).toBe(60_000);
    expect(clock.progress).toBeCloseTo(1 / 3);
    expect(clock.intervalSeconds).toBe(90);
  });

  test('ladder falls back to start + interval without next_round_at', () => {
    const clock = getRoundClock(ladder({ nextRoundAt: null }), at(45))!;

    expect(clock.phase).toBe('next_round');
    expect(clock.remainingMs).toBe(45_000);
  });

  test('ladder waits in pairing past the target until the round is created', () => {
    // Every tick opens a round, so the clock never guesses a new countdown on its own.
    expect(getRoundClock(ladder(), at(91))!.phase).toBe('pairing');
    expect(getRoundClock(ladder(), at(500))!.phase).toBe('pairing');
  });

  test('corrects a skewed local clock with the server offset', () => {
    // The browser runs 5s fast: without the offset it would hit zero 5s early.
    const input = ladder({ clockOffsetMs: -5_000 });
    const clock = getRoundClock(input, at(90) + 2_000)!;

    expect(clock.phase).toBe('next_round');
    expect(clock.remainingMs).toBe(3_000);
  });

  test('ladder break counts down to the break end', () => {
    const clock = getRoundClock(
      ladder({ breakState: 'on', lastRoundEndedAt: naive(40), nextRoundAt: iso(70) }),
      at(55),
    )!;

    expect(clock.phase).toBe('break');
    expect(clock.remainingMs).toBe(15_000);
    expect(clock.progress).toBeCloseTo(0.5);
  });

  test('break falls back to ended_at + break duration and turns into pairing', () => {
    const input = ladder({ breakState: 'on', lastRoundEndedAt: naive(40), nextRoundAt: null });

    expect(getRoundClock(input, at(50))!.remainingMs).toBe(20_000);
    expect(getRoundClock(input, at(71))!.phase).toBe('pairing');
  });

  test('the last ladder round counts down to the final deadline', () => {
    const input = ladder({ currentRoundPosition: 9, nextRoundAt: iso(72) });
    const clock = getRoundClock(input, at(12))!;

    expect(clock.phase).toBe('final');
    expect(clock.isLastRound).toBe(true);
    expect(clock.remainingMs).toBe(60_000);
    expect(getRoundClock(input, at(80))!.phase).toBe('finishing');
  });

  test('swiss counts down to the round end', () => {
    const input: RoundClockInput = {
      type: 'swiss',
      state: 'active',
      breakState: 'off',
      currentRoundPosition: 0,
      roundsLimit: 3,
      currentRoundTimeoutSeconds: 120,
      lastRoundStartedAt: naive(0),
    };

    const clock = getRoundClock(input, at(30))!;
    expect(clock.phase).toBe('round_ends');
    expect(clock.remainingMs).toBe(90_000);
    expect(getRoundClock(input, at(121))!.phase).toBe('finishing');
  });

  test('unknown timing still yields a phase without a countdown', () => {
    const clock = getRoundClock(
      ladder({ lastRoundStartedAt: null, nextRoundAt: null, currentRoundTimeoutSeconds: null }),
      at(10),
    )!;

    expect(clock.phase).toBe('next_round');
    expect(clock.remainingMs).toBe(0);
    expect(clock.progress).toBeNull();
  });
});

describe('getRoundSchedule', () => {
  const durations = [60, 90, 120, 182];

  test('plans every round from the start time before the tournament begins', () => {
    const schedule = getRoundSchedule({
      type: 'ladder',
      state: 'waiting_participants',
      startsAt: iso(0),
      roundDurations: durations,
    })!;

    expect(schedule.rounds.map((round) => round.startsAtMs)).toEqual([
      at(0),
      at(60),
      at(150),
      at(270),
    ]);
    expect(schedule.finishAtMs).toBe(at(452));
    expect(schedule.totalSeconds).toBe(452);
  });

  test('once running, counts the remaining rounds from the next round moment', () => {
    // Round 2 (position 1) started at 60 and round 3 opens at 150.
    const schedule = getRoundSchedule(
      ladder({
        currentRoundPosition: 1,
        lastRoundStartedAt: naive(60),
        nextRoundAt: iso(150),
        roundDurations: durations,
      }),
    )!;

    expect(schedule.rounds.map((round) => round.startsAtMs)).toEqual([
      null,
      at(60),
      at(150),
      at(270),
    ]);
    expect(schedule.finishAtMs).toBe(at(452));
  });

  test('an early round pulls the rest of the schedule forward', () => {
    // Everyone finished early: round 3 opened at 100 instead of 150, so round 4 is due at 220.
    const schedule = getRoundSchedule(
      ladder({
        currentRoundPosition: 2,
        lastRoundStartedAt: naive(100),
        nextRoundAt: iso(220),
        roundDurations: durations,
      }),
    )!;

    expect(schedule.rounds[3].startsAtMs).toBe(at(220));
    expect(schedule.finishAtMs).toBe(at(402));
  });

  test('in the last round the next round moment is the finish deadline', () => {
    const schedule = getRoundSchedule(
      ladder({
        currentRoundPosition: 3,
        lastRoundStartedAt: naive(270),
        nextRoundAt: iso(452),
        roundDurations: durations,
      }),
    )!;

    expect(schedule.finishAtMs).toBe(at(452));
  });

  test('converts server times to the local clock', () => {
    const schedule = getRoundSchedule(
      ladder({
        currentRoundPosition: 0,
        nextRoundAt: iso(60),
        roundDurations: durations,
        clockOffsetMs: 5_000,
      }),
    )!;

    // The server is 5s ahead, so its moments happen 5s earlier on the local clock.
    expect(schedule.rounds[1].startsAtMs).toBe(at(55));
  });

  test('is only available for ladders with a known plan', () => {
    expect(getRoundSchedule(ladder({ roundDurations: null }))).toBeNull();
    expect(getRoundSchedule(ladder({ type: 'swiss', roundDurations: durations }))).toBeNull();
    expect(getRoundSchedule(ladder({ state: 'finished', roundDurations: durations }))).toBeNull();
  });
});

describe('tournament slice clock offset', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  test('records serverTime - localTime when a payload carries the server clock', () => {
    vi.useFakeTimers();
    vi.setSystemTime(at(0));

    const { payload } = tournamentActions.updateTournamentData({
      nextRoundAt: iso(60),
      serverTime: iso(-4),
    });

    expect(payload.clockOffsetMs).toBe(-4_000);
  });

  test('leaves payloads without a server clock untouched', () => {
    const { payload } = tournamentActions.updateTournamentData({ ranking: { entries: [] } });

    expect(payload).not.toHaveProperty('clockOffsetMs');
  });
});
