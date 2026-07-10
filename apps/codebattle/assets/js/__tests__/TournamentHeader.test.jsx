import React from 'react';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import copy from 'copy-to-clipboard';

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
      lastRoundStartedAt={null}
      lastRoundEndedAt={null}
      startsAt={new Date().toISOString()}
      type="team"
      accessType="token"
      accessToken="secret-token"
      isLive
      name="Private Arena"
      players={{}}
      playersCount={0}
      playersLimit={100}
      currentUserId={1}
      showBots
      hideResults
      isOnline
      isOver
      canModerate
      toggleShowBots={vi.fn()}
      toggleStreamMode={vi.fn()}
      handleStartRound={vi.fn()}
      handleOpenDetails={vi.fn()}
    />,
  );

  const copyButton = screen.getByTestId('copy-button');
  await user.click(copyButton);

  expect(copy).toHaveBeenCalledWith('http://localhost/tournaments/42?access_token=secret-token');
});
