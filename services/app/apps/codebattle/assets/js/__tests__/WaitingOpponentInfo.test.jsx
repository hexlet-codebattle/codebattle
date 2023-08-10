import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/extend-expect';
import copy from 'copy-to-clipboard';

import WaitingOpponentInfo from '../widgets/pages/game/WaitingOpponentInfo';

jest.mock('copy-to-clipboard', () => jest.fn());

test('test WaitingOpponentInfo url', async () => {
  const url = 'some-url-for.test';
  render(<WaitingOpponentInfo gameUrl={url} />);

  expect(screen.getByDisplayValue(url)).toBeInTheDocument();
});

test('test WaitingOpponentInfo copy button', async () => {
  const url = 'some-url-for.test';
  const user = userEvent.setup();
  render(<WaitingOpponentInfo gameUrl={url} />);

  const copyButton = screen.getByTestId('copy-button');

  expect(copyButton).toBeInTheDocument();

  await user.click(copyButton);

  expect(copy).toBeCalledWith(url);
});
