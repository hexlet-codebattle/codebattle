import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import React from 'react';

import Message from '../widgets/components/Message';

import { MantineTestProvider } from './helpers/mantine';

vi.mock('react-redux', () => ({ useSelector: () => ({ name: 'General' }) }));

test('tournament chat renders a plain player name with an explicit admin ban action', async () => {
  const user = userEvent.setup();
  const handleBanUser = vi.fn();

  render(
    <MantineTestProvider>
      <Message
        name="TournamentPlayer"
        userId={42}
        time={1}
        text="Good luck!"
        onBanUser={handleBanUser}
      />
    </MantineTestProvider>,
  );

  expect(screen.getByText('TournamentPlayer').closest('[role="button"]')).toBeNull();
  expect(screen.queryByTitle('Message (TournamentPlayer)')).not.toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'Ban TournamentPlayer' }));
  expect(handleBanUser).toHaveBeenCalledWith({ userId: 42, name: 'TournamentPlayer' });
});
