import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import copy from 'copy-to-clipboard';
import React from 'react';

import WaitingOpponentInfo from '../widgets/pages/game/WaitingOpponentInfo';

vi.mock('copy-to-clipboard', () => ({ default: vi.fn() }));

test('WaitingOpponentInfo url', async () => {
  const url = 'some-url-for.test';
  render(<WaitingOpponentInfo gameUrl={url} />);

  expect(screen.getByText(url)).toBeInTheDocument();
});

test('WaitingOpponentInfo copy button', async () => {
  const url = 'some-url-for.test';
  const user = userEvent.setup();
  render(<WaitingOpponentInfo gameUrl={url} />);

  const copyButton = screen.getByTestId('copy-button');

  expect(copyButton).toBeInTheDocument();

  await user.click(copyButton);

  expect(copy).toHaveBeenCalledWith(url);
});

test('WaitingOpponentInfo renders a QR code of the absolute join url', () => {
  render(<WaitingOpponentInfo gameUrl="http://localhost/games/123?foo=bar#chat" />);

  const qr = screen.getByTestId('game-invite-qr-code');
  expect(qr).toHaveAttribute('data-value', 'http://localhost/games/123');
  expect(qr.querySelector('svg')).toBeInTheDocument();
});

test('WaitingOpponentInfo resolves a relative game url against the origin', () => {
  render(<WaitingOpponentInfo gameUrl="/games/7" />);

  expect(screen.getByTestId('game-invite-qr-code')).toHaveAttribute(
    'data-value',
    `${window.location.origin}/games/7`,
  );
});
