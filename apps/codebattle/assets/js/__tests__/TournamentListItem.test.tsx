import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

import i18n from '../i18n';
import dayjs from '../i18n/dayjs';
import TournamentListItem from '../widgets/pages/lobby/TournamentListItem';

vi.mock('@/inertia/pageProps', () => ({
  getPageProp: (key: string, fallback?: unknown) => (key === 'locale' ? 'en' : fallback),
}));

vi.mock('@fortawesome/react-fontawesome', () => ({
  FontAwesomeIcon: 'img',
}));

afterEach(async () => {
  await i18n.changeLanguage('en');
  dayjs.locale('en');
  vi.useRealTimers();
});

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

test('localizes the tournament date, action, and countdown label', async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-08-01T00:00:00Z'));
  await i18n.changeLanguage('ru');
  dayjs.locale('ru');

  const { rerender } = render(<TournamentListItem tournament={baseTournament} />);

  expect(screen.getByRole('link', { name: 'Открыть' })).toBeInTheDocument();
  expect(screen.getAllByText(/июл/).length).toBeGreaterThan(0);

  rerender(
    <TournamentListItem
      tournament={{
        ...baseTournament,
        state: 'upcoming',
        startsAt: '2026-08-01T12:00:00Z',
      }}
    />,
  );

  expect(screen.getByText(/начнётся через/)).toBeInTheDocument();
  expect(screen.getAllByText(/авг/).length).toBeGreaterThan(0);
});
