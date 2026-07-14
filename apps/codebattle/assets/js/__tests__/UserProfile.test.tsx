import '@testing-library/jest-dom';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { render, waitFor } from '@testing-library/react';
import React, { type ReactNode } from 'react';
import { Provider } from 'react-redux';

import UserProfile from '../widgets/pages/profile';
import reducers from '../widgets/slices';

// jsdom URL the profile page reads the user id from (was @jest-environment-options).
window.history.pushState({}, '', '/users/42');

vi.mock('@/inertia/pageProps', () => {
  const pageProps = { local: 'en', current_user: { sound_settings: {} } };
  return {
    getPageProp: (key: keyof typeof pageProps, fallback?: unknown) => pageProps[key] ?? fallback,
  };
});

vi.mock('../i18n', () => ({
  __esModule: true,
  getLocale: vi.fn(() => 'en'),
  getSupportedLocale: vi.fn((locale: string | undefined) => locale || 'en'),
  default: {
    language: 'en',
    t: vi.fn((key: string, params: Record<string, unknown> = {}) =>
      key.replace(/%\{(\w+)\}/g, (_match: string, name: string) =>
        String(params[name] ?? `%{${name}}`),
      ),
    ),
  },
}));

vi.mock('../widgets/components/LanguageIcon', () => ({ default: () => <span>lang-icon</span> }));
vi.mock('../widgets/components/Loading', () => ({
  default: ({ small }: { small?: boolean; children?: ReactNode }) => (
    <div>{small ? 'loading-small' : 'loading'}</div>
  ),
}));
vi.mock('../widgets/pages/profile/Heatmap', () => ({ default: () => <div>heatmap</div> }));
vi.mock('../widgets/pages/profile/UserStatCharts', () => ({ default: () => <div>charts</div> }));
vi.mock('../widgets/pages/profile/UserTournaments', () => ({
  default: () => <div>tournaments</div>,
}));
vi.mock('../widgets/pages/lobby/CompletedGames', () => ({
  default: () => <div>completed-games</div>,
}));

const reducer = combineReducers(reducers);

describe('UserProfile', () => {
  let fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          active_game_id: null,
          achievements: [],
          metrics: {
            game_stats: { won: 3, lost: 1, gave_up: 0 },
            language_stats: { js: 2, ts: 2 },
            tournaments_stats: {
              rookie_wins: 0,
              challenger_wins: 0,
              pro_wins: 0,
              elite_wins: 0,
              masters_wins: 0,
              grand_slam_wins: 0,
            },
          },
          season_results: [],
          stats: { games: { won: 3, lost: 1, gave_up: 0 }, all: [] },
          user: {
            id: 42,
            name: 'Kleria',
            avatar_url: '/assets/images/logo.svg',
            lang: 'js',
            clan: '',
            clan_id: null,
            github_name: 'Kleria',
            inserted_at: '2026-01-01T12:00:00Z',
            rating: 1500,
            rank: 10,
            points: 100,
            is_bot: false,
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          top_rivals: [],
        }),
      });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  test('does not render or request holopin resources on the profile page', async () => {
    const store = configureStore({ reducer });
    const { container, getByLabelText, queryByText } = render(
      <Provider store={store}>
        <UserProfile />
      </Provider>,
    );

    await waitFor(() => {
      expect(getByLabelText('Github account')).toHaveAttribute('href', 'https://github.com/Kleria');
    });

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/v1/user/42/stats');
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/v1/user/42/rivals');
    expect(queryByText('Holopins')).not.toBeInTheDocument();
    expect(container.querySelector('a[href^="https://holopin.io/@"]')).not.toBeInTheDocument();
    expect(container.querySelector('img[src^="https://holopin.me/@"]')).not.toBeInTheDocument();
  });
});
