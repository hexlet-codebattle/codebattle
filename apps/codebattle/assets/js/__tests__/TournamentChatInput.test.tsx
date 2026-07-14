import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import React from 'react';

import TournamentChatInput from '../widgets/pages/tournament/TournamentChatInput';
import { addMessage } from '../widgets/middlewares/Chat';

vi.mock('i18next', () => ({
  default: { init: vi.fn(), t: (key: string) => key },
}));
vi.mock('../widgets/middlewares/Chat', () => ({ addMessage: vi.fn() }));
vi.mock('react-redux', () => ({ useSelector: () => ({ name: 'General' }) }));
vi.mock('bad-words-next', () => ({
  default: class BadWordsNextMock {
    add() {}

    filter(value: string) {
      return value;
    }
  },
}));

test('TournamentChatInput keeps Send disabled for an empty message', async () => {
  const user = userEvent.setup();
  render(<TournamentChatInput />);

  const input = screen.getByRole('textbox', { name: 'Chat message' });
  const sendButton = screen.getByRole('button', { name: 'Send' });

  expect(sendButton).toBeDisabled();
  await user.type(input, '   ');
  expect(sendButton).toBeDisabled();
  expect(addMessage).not.toHaveBeenCalled();
});

test('TournamentChatInput sends a general tournament chat message', async () => {
  const user = userEvent.setup();
  render(<TournamentChatInput />);

  await user.type(screen.getByRole('textbox', { name: 'Chat message' }), 'Good luck!');
  await user.click(screen.getByRole('button', { name: 'Send' }));

  expect(addMessage).toHaveBeenCalledWith({
    text: 'Good luck!',
    meta: { type: 'general' },
  });
});
