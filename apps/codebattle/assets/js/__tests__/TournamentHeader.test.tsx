import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import copy from 'copy-to-clipboard';
import React from 'react';

import TournamentHeader from '../widgets/pages/tournament/TournamentHeader';

vi.mock('copy-to-clipboard', () => ({ default: vi.fn() }));
vi.mock('../widgets/pages/tournament/TournamentMainControlButtons', () => ({
  default: () => null,
}));
vi.mock('../widgets/pages/tournament/JoinButton', () => ({ default: () => null }));

test('TournamentHeader copies full private tournament url', async () => {
  const user = userEvent.setup();

  render(
    <TournamentHeader
      id={42}
      state="canceled"
      streamMode={false}
      breakState="off"
      breakDurationSeconds={0}
      currentRoundTimeoutSeconds={120}
      lastRoundStartedAt={undefined}
      lastRoundEndedAt={undefined}
      startsAt={new Date().toISOString()}
      accessType="token"
      accessToken="secret-token"
      isLive
      name="Private Arena"
      players={{}}
      playersCount={0}
      playersLimit={100}
      currentUserId={1}
      hideResults
      isOnline
      isOver
      canModerate
      toggleStreamMode={vi.fn()}
      handleStartRound={vi.fn()}
      handleOpenDetails={vi.fn()}
    />,
  );

  const copyButton = screen.getByTestId('copy-button');
  await user.click(copyButton);

  expect(copy).toHaveBeenCalledWith('http://localhost/tournaments/42?access_token=secret-token');
});

test('TournamentHeader shows the grade icon and first-place ranking points', () => {
  const { container } = render(
    <TournamentHeader
      id={42}
      state="canceled"
      breakState="off"
      startsAt={new Date().toISOString()}
      accessToken=""
      name="Masters"
      grade="masters"
      players={{}}
      playersCount={0}
      currentUserId={1}
      toggleStreamMode={vi.fn()}
      handleStartRound={vi.fn()}
      handleOpenDetails={vi.fn()}
    />,
  );

  expect(screen.getByLabelText('masters grade')).toContainElement(container.querySelector('svg'));
  expect(screen.getByText('1024')).toHaveClass('cb-tournament-points-value');
  expect(screen.getByText('Ranking Points')).toBeInTheDocument();
});

test('TournamentHeader omits grade details for open tournaments', () => {
  render(
    <TournamentHeader
      id={42}
      state="canceled"
      breakState="off"
      startsAt={new Date().toISOString()}
      accessToken=""
      name="Open Arena"
      grade="open"
      players={{}}
      playersCount={0}
      currentUserId={1}
      toggleStreamMode={vi.fn()}
      handleStartRound={vi.fn()}
      handleOpenDetails={vi.fn()}
    />,
  );

  expect(screen.queryByText('Ranking Points')).not.toBeInTheDocument();
  expect(screen.queryByLabelText('open grade')).not.toBeInTheDocument();
});

const renderPrivateHeader = (props = {}) =>
  render(
    <TournamentHeader
      id={42}
      state="waiting_participants"
      streamMode={false}
      breakState="off"
      startsAt={new Date().toISOString()}
      accessType="token"
      accessToken="secret-token"
      isLive
      name="Private Arena"
      players={{}}
      playersCount={0}
      currentUserId={1}
      isOnline
      canModerate
      toggleStreamMode={vi.fn()}
      handleStartRound={vi.fn()}
      handleOpenDetails={vi.fn()}
      {...props}
    />,
  );

test('TournamentHeader toggles a QR code of the private invite url', async () => {
  const user = userEvent.setup();
  renderPrivateHeader();

  expect(screen.queryByTestId('tournament-access-qr-code')).not.toBeInTheDocument();

  const toggle = screen.getByTestId('tournament-access-qr-toggle');
  expect(toggle).toHaveTextContent('Show QR');
  await user.click(toggle);

  const qr = screen.getByTestId('tournament-access-qr-code');
  expect(qr).toHaveAttribute(
    'data-value',
    'http://localhost/tournaments/42?access_token=secret-token',
  );
  expect(qr.querySelector('svg')).toBeInTheDocument();
  expect(toggle).toHaveTextContent('Hide QR');

  await user.click(toggle);
  expect(screen.queryByTestId('tournament-access-qr-code')).not.toBeInTheDocument();
});

test('TournamentHeader hides the QR toggle for public tournaments', () => {
  renderPrivateHeader({ accessType: 'public' });

  expect(screen.queryByTestId('tournament-access-qr-toggle')).not.toBeInTheDocument();
});

const renderActiveLadderHeader = (props = {}) =>
  render(
    <TournamentHeader
      id={42}
      state="active"
      type="ladder"
      breakState="off"
      startsAt={new Date().toISOString()}
      accessToken=""
      name="Ladder Arena"
      players={{ 1: { id: 1 } }}
      playersCount={4}
      currentUserId={1}
      currentRoundPosition={2}
      roundsLimit={5}
      currentRoundTimeoutSeconds={90}
      lastRoundStartedAt={new Date(Date.now() - 30_000).toISOString()}
      nextRoundAt={new Date(Date.now() + 60_000).toISOString()}
      isLive
      isOnline
      toggleStreamMode={vi.fn()}
      handleStartRound={vi.fn()}
      handleOpenDetails={vi.fn()}
      {...props}
    />,
  );

test('TournamentHeader shows the next-round countdown and round track for an active ladder', () => {
  const { container } = renderActiveLadderHeader();

  const clock = screen.getByTestId('tournament-round-clock');
  expect(clock).toHaveClass('cb-round-clock-phase-next-round');
  expect(screen.getByText('Round 4 starts in')).toBeInTheDocument();
  expect(screen.getByText('3/5')).toBeInTheDocument();
  expect(screen.getByText(/^(1:00|0:59)$/)).toBeInTheDocument();
  expect(screen.getByRole('img', { name: 'Round 3 of 5' })).toBeInTheDocument();
  expect(container.querySelectorAll('.cb-round-track-segment')).toHaveLength(5);
  expect(container.querySelectorAll('.cb-round-track-segment-done')).toHaveLength(2);
  // The current round fills up as its time runs out; the next one is still ahead.
  expect(
    container.querySelector('.cb-round-track-segment-current .cb-round-track-fill'),
  ).toBeInTheDocument();
  expect(container.querySelector('.cb-round-track-segment-next')).not.toBeInTheDocument();
});

test('TournamentHeader links a ladder participant to their live game', () => {
  renderActiveLadderHeader({ activeGameId: 777 });

  expect(screen.getByText('Your game is live')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Open game' })).toHaveAttribute('href', '/games/777');
});

test('TournamentHeader tells an idle ladder participant they wait for the next round', () => {
  renderActiveLadderHeader();

  expect(
    screen.getByText("You're in the pool — you'll get an opponent when the next round starts"),
  ).toBeInTheDocument();
});

test('TournamentHeader shows the break countdown', () => {
  renderActiveLadderHeader({
    breakState: 'on',
    lastRoundEndedAt: new Date(Date.now() - 10_000).toISOString(),
    nextRoundAt: new Date(Date.now() + 20_000).toISOString(),
  });

  expect(screen.getByTestId('tournament-round-clock')).toHaveClass('cb-round-clock-phase-break');
  expect(screen.getByText('Break')).toBeInTheDocument();
});

test('TournamentHeader shows the ladder timeline and its finish time', () => {
  const { container } = renderActiveLadderHeader({ roundDurations: [60, 90, 90, 120, 182] });

  const segments = container.querySelectorAll<HTMLElement>('.cb-round-track-segment');
  // Segments are sized by each round's planned length.
  expect(Array.from(segments).map((segment) => segment.style.flexGrow)).toEqual([
    '60',
    '90',
    '90',
    '120',
    '182',
  ]);
  expect(segments[3]).toHaveAttribute('title', expect.stringMatching(/^Round 4 · /));
  expect(screen.getByText('Rounds left: 2')).toBeInTheDocument();
  expect(screen.getByText(/^Ends by /)).toBeInTheDocument();
});

test('the game page clock shows the round of the viewed game, not the current round', async () => {
  const { default: TournamentRoundClock } =
    await import('../widgets/components/TournamentRoundClock');

  // The tournament is in round 3 of 4, but this game was paired in round 1.
  const { container } = render(
    <TournamentRoundClock
      gameRoundPosition={0}
      gameRoundLabel="Your round"
      tournament={{
        type: 'ladder',
        state: 'active',
        breakState: 'off',
        currentRoundPosition: 2,
        roundsLimit: 4,
        currentRoundTimeoutSeconds: 60,
        lastRoundStartedAt: new Date(Date.now() - 10_000).toISOString(),
        nextRoundAt: new Date(Date.now() + 50_000).toISOString(),
      }}
    />,
  );

  expect(screen.getByText('1/4')).toBeInTheDocument();
  expect(screen.getByText('Your round')).toBeInTheDocument();
  // The countdown still targets the tournament's next round.
  expect(screen.getByText('Round 4 starts in')).toBeInTheDocument();

  const segments = container.querySelectorAll('.cb-round-track-segment');
  expect(segments[0]).toHaveClass('cb-round-track-segment-marked');
  expect(segments[2]).toHaveClass('cb-round-track-segment-current');
});

test('the compact clock puts its note in place of the hint and keeps the timeline', async () => {
  const { default: TournamentRoundClock } =
    await import('../widgets/components/TournamentRoundClock');

  const { container } = render(
    <TournamentRoundClock
      compact
      tournament={{
        type: 'ladder',
        state: 'active',
        breakState: 'off',
        currentRoundPosition: 1,
        roundsLimit: 3,
        currentRoundTimeoutSeconds: 60,
        lastRoundStartedAt: new Date(Date.now() - 10_000).toISOString(),
        nextRoundAt: new Date(Date.now() + 50_000).toISOString(),
        roundDurations: [60, 60, 120],
      }}
    >
      <span>note for the player</span>
    </TournamentRoundClock>,
  );

  const clock = screen.getByTestId('tournament-round-clock');
  expect(clock).toHaveClass('cb-round-clock-compact');
  expect(screen.queryByText('Players still in a game skip the round')).not.toBeInTheDocument();
  expect(container.querySelector('.cb-round-clock-text')).toHaveTextContent('note for the player');
  expect(container.querySelectorAll('.cb-round-track-segment')).toHaveLength(3);
  expect(screen.getByText(/^Ends by /)).toBeInTheDocument();
});
