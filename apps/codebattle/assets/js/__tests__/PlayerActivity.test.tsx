import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

import { PlayerActivity } from '../widgets/pages/lobby/LobbyChat';

const user = { id: 1, name: 'ada' } as any;

test('links a player to the public game they play', () => {
  render(
    <PlayerActivity
      player={{ id: 1, user, currentState: 'playing', currentLink: '/games/324274' }}
    />,
  );

  const link = screen.getByTestId('player-activity-1');
  expect(link).toHaveAttribute('href', '/games/324274');
  expect(link).toHaveTextContent('#324274');
});

test('links a player to their tournament', () => {
  render(
    <PlayerActivity
      player={{ id: 2, user, currentState: 'tournament', currentLink: '/tournaments/5775' }}
    />,
  );

  expect(screen.getByTestId('player-activity-2')).toHaveAttribute('href', '/tournaments/5775');
});

test('shows nothing for lobby players', () => {
  const { container } = render(<PlayerActivity player={{ id: 4, user, currentState: 'lobby' }} />);

  expect(container).toBeEmptyDOMElement();
});
