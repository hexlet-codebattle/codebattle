import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

import TournamentListItem from '../widgets/pages/lobby/TournamentListItem';

vi.mock('@/inertia/pageProps', () => ({
  getPageProp: (key: string, fallback?: unknown) => (key === 'locale' ? 'en' : fallback),
}));

vi.mock('@fortawesome/react-fontawesome', () => ({
  FontAwesomeIcon: 'img',
}));

const baseTournament = {
  id: 1,
  name: 'Rookie',
  grade: 'rookie',
  state: 'finished',
  startsAt: '2026-07-09T00:00:00Z',
  playersCount: 3,
};

test('does not render invalid date for finished tournament without last round end date', () => {
  render(<TournamentListItem tournament={baseTournament} />);

  expect(screen.queryByText('Invalid Date')).not.toBeInTheDocument();
  expect(screen.getByText('Rookie')).toBeInTheDocument();
  expect(screen.getAllByText(/at /).length).toBeGreaterThan(0);
});
