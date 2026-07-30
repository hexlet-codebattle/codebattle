import React from 'react';

import { render, screen } from '@testing-library/react';

import GameActionButton from '../widgets/pages/lobby/GameActionButton';

test('uses the full-width localized continue action outside the games table', () => {
  render(
    <GameActionButton
      type="card"
      currentUserId={7}
      game={{
        id: 42,
        state: 'playing',
        level: 'easy',
        players: [{ id: 7 }],
      }}
    />,
  );

  expect(screen.getByRole('link', { name: 'Continue' })).toHaveClass('w-100');
});
