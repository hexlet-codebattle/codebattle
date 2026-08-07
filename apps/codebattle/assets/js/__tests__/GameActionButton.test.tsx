import React from 'react';

import { render, screen } from '@testing-library/react';

import GameActionButton from '../widgets/pages/lobby/GameActionButton';

import { MantineTestProvider } from './helpers/mantine';

test('uses the full-width localized continue action outside the games table', () => {
  render(
    <MantineTestProvider>
      <GameActionButton
        type="card"
        currentUserId={7}
        game={{
          id: 42,
          state: 'playing',
          level: 'easy',
          players: [{ id: 7 }],
        }}
      />
    </MantineTestProvider>,
  );

  expect(screen.getByRole('link', { name: 'Continue' })).toHaveAttribute('data-block', 'true');
});
