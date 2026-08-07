import '@testing-library/jest-dom';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { type ReactElement } from 'react';
import { Provider } from 'react-redux';

import UserSettings from '../widgets/pages/settings';
import reducers from '../widgets/slices';

import { MantineTestProvider } from './helpers/mantine';

vi.mock('@fortawesome/react-fontawesome', () => ({
  FontAwesomeIcon: () => <span aria-hidden="true" />,
}));

vi.mock('calcite-react/Slider', () => ({ default: 'input' }));
vi.mock('../widgets/components/LanguageIcon', () => ({
  default: ({ lang }: { lang?: string }) => <span data-testid={`language-icon-${lang}`} />,
}));

vi.mock('../i18n', () => ({
  __esModule: true,
  getLocale: vi.fn(() => 'en'),
  getSupportedLocale: vi.fn((locale) => (['en', 'ru'].includes(locale) ? locale : 'en')),
  default: {
    t: vi.fn((key: string, params: Record<string, unknown> = {}) =>
      Object.entries(params).reduce(
        (result, [name, value]) => result.replace(`%{${name}}`, String(value)),
        key,
      ),
    ),
    changeLanguage: vi.fn(() => Promise.resolve()),
  },
}));

const reducer = combineReducers(reducers);

const preloadedState = {
  user: {
    settings: {
      soundSettings: {
        type: 'standard',
        level: 6,
        tournamentLevel: 4,
      },
      id: 11,
      name: 'Diman',
      lang: 'ts',
      avatarUrl: '/assets/images/logo.svg',
      canUnlinkSocial: false,
      discordName: null,
      discordId: null,
      error: '',
    },
  },
};
const store = configureStore({
  reducer,
  preloadedState: preloadedState as never,
});
vi.mock('@/inertia/pageProps', () => {
  const pageProps = {
    local: 'en',
    current_user: { sound_settings: {} },
    game_id: 10,
    user_sessions: [
      {
        id: 'current-session',
        current: true,
        user_agent: 'Current browser',
        ip: '127.0.0.1',
        last_seen_at: '2026-07-23T12:00:00Z',
        created_at: '2026-07-23T11:00:00Z',
      },
      {
        id: 'other-session',
        current: false,
        user_agent: 'Other browser',
        ip: '10.0.0.2',
        last_seen_at: '2026-07-22T12:00:00Z',
        created_at: '2026-07-22T11:00:00Z',
      },
    ],
  };
  return {
    getPageProp: (key: keyof typeof pageProps, fallback?: unknown) => pageProps[key] ?? fallback,
  };
});

describe('UserSettings test cases', () => {
  let fetchMock = vi.fn();

  function setup(jsx: ReactElement) {
    return {
      user: userEvent.setup(),
      ...render(<MantineTestProvider>{jsx}</MantineTestProvider>),
    };
  }

  beforeEach(() => {
    fetchMock = vi.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  test('render main component', () => {
    const { getByRole } = setup(
      <Provider store={store}>
        <UserSettings />
      </Provider>,
    );
    expect(getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    expect(getByRole('button', { name: 'Mute sound' })).toBeInTheDocument();
  });

  test('successfull user settings update', async () => {
    const settingUpdaterSpy = fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ name: 'Dmitry', clan: '' }),
    });
    const { getByRole, getByTestId, user } = setup(
      <Provider store={store}>
        <UserSettings />
      </Provider>,
    );
    const submitButton = getByRole('button', { name: 'Update profile' });
    const nameInput = getByTestId('nameInput');

    await user.clear(nameInput);
    await user.type(nameInput, 'Dmitry');
    await user.click(submitButton);

    await waitFor(() => {
      expect(settingUpdaterSpy).toHaveBeenCalledWith(
        '/api/v1/settings',
        expect.objectContaining({
          method: 'PATCH',
        }),
      );

      const [, requestOptions] = settingUpdaterSpy.mock.calls[0];
      expect(JSON.parse(requestOptions.body)).toEqual({
        clan: '',
        name: 'Dmitry',
      });
      expect(getByRole('alert')).toHaveClass('alert-success');
    });
  });

  test('automatically saves a language change', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ lang: 'js' }),
    });
    const { getByTestId, findByText, user } = setup(
      <Provider store={store}>
        <UserSettings />
      </Provider>,
    );

    await user.click(getByTestId('code-langSelect'));
    await user.click(await findByText('Javascript'));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
        lang: 'js',
      });
    });
  });

  test('successfull locale change', async () => {
    const settingUpdaterSpy = fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ locale: 'ru' }),
    });
    const { getByTestId, findByText, user } = setup(
      <Provider store={store}>
        <UserSettings />
      </Provider>,
    );
    const localeSelect = getByTestId('localeSelect');

    await user.click(localeSelect);
    await user.click(await findByText('Ru'));

    await waitFor(() => {
      const [, requestOptions] = settingUpdaterSpy.mock.calls[0];
      expect(JSON.parse(requestOptions.body)).toMatchObject({
        locale: 'ru',
      });
    });

    const i18n = (
      await vi.importMock<{
        default: { changeLanguage: ReturnType<typeof vi.fn> };
      }>('../i18n')
    ).default;
    expect(i18n.changeLanguage).toHaveBeenCalledWith('ru');
  });

  test('failed user settings update', async () => {
    const { getByTestId, getByRole, findByRole, findByText, user } = setup(
      <Provider store={store}>
        <UserSettings />
      </Provider>,
    );
    const submitButton = getByRole('button', { name: 'Update profile' });
    const nameInput = getByTestId('nameInput');

    await user.clear(nameInput);

    expect(await findByText(/Field can't be empty/i)).toBeInTheDocument();
    expect(submitButton).toBeDisabled();

    await user.type(nameInput, '   ');

    expect(
      await findByText(
        /Must consist of Latin letters, numbers and underscores. Only begin with latin letter/i,
      ),
    ).toBeInTheDocument();
    expect(submitButton).toBeDisabled();

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({
        errors: {
          name: ['has already been taken'],
        },
      }),
    });

    await user.clear(nameInput);
    await user.type(nameInput, 'ExistingUserName');

    expect(submitButton).toBeEnabled();

    await user.click(submitButton);

    expect(await findByText(/Has already been taken/i)).toBeInTheDocument();

    fetchMock.mockRejectedValueOnce(new Error('Network Error'));

    await user.clear(nameInput);
    await user.type(nameInput, 'CoolUserName');
    await user.click(submitButton);

    expect(await findByRole('alert')).toHaveClass('alert-danger');
  });

  test('does not offer the legacy Silent sound type', () => {
    const { queryByLabelText } = setup(
      <Provider store={store}>
        <UserSettings />
      </Provider>,
    );

    expect(queryByLabelText('Silent')).not.toBeInTheDocument();
  });

  test('automatically saves sound theme and level changes', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sound_settings: { type: 'cs', level: 6, tournament_level: 4 },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sound_settings: { type: 'cs', level: 8, tournament_level: 4 },
        }),
      });

    const { getByRole, getByLabelText, user } = setup(
      <Provider store={store}>
        <UserSettings />
      </Provider>,
    );

    await user.click(getByRole('radio', { name: 'CS' }));

    await waitFor(() => {
      expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
        sound_settings: { type: 'cs' },
      });
    });

    fireEvent.input(getByLabelText('Game sound level'), {
      target: { value: '8' },
    });

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({
        sound_settings: { level: 8 },
      });
    });
  });

  test('shows language icons in the settings language menu', () => {
    setup(
      <Provider store={store}>
        <UserSettings />
      </Provider>,
    );

    expect(screen.getAllByTestId('language-icon-js').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('language-icon-python').length).toBeGreaterThan(0);
  });

  test('changes a password without sending password fields to the settings endpoint', async () => {
    const passwordStore = configureStore({
      reducer,
      preloadedState: {
        user: {
          settings: {
            ...preloadedState.user.settings,
            hasPassword: true,
          },
        },
      } as never,
    });

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'ok', has_password: true }),
    });

    const { getByRole, getByTestId, user } = setup(
      <Provider store={passwordStore}>
        <UserSettings />
      </Provider>,
    );

    await user.type(getByTestId('currentPasswordInput'), 'old-password-secure!');
    await user.type(getByTestId('passwordInput'), 'new-password-secure!');
    await user.type(getByTestId('passwordConfirmationInput'), 'new-password-secure!');
    await user.click(getByRole('button', { name: 'Change password' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/settings/password');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      current_password: 'old-password-secure!',
      password: 'new-password-secure!',
      password_confirmation: 'new-password-secure!',
    });
  });

  test('requests a verified email change for Firebase users', async () => {
    const firebaseStore = configureStore({
      reducer,
      preloadedState: {
        user: {
          settings: {
            ...preloadedState.user.settings,
            email: 'old@example.com',
            hasFirebaseAuth: true,
          },
        },
      } as never,
    });

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'verification_sent' }),
    });

    const { getByRole, getByTestId, getByDisplayValue, findByRole, user } = setup(
      <Provider store={firebaseStore}>
        <UserSettings />
      </Provider>,
    );

    expect(getByDisplayValue('old@example.com')).toHaveAttribute('readonly');
    await user.type(getByTestId('newEmailInput'), 'new@example.com');
    await user.type(getByTestId('emailCurrentPasswordInput'), 'firebase-password');
    await user.click(getByRole('button', { name: 'Send verification email' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/settings/email',
        expect.objectContaining({ method: 'PATCH' }),
      );

      expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
        email: 'new@example.com',
        current_password: 'firebase-password',
      });
    });

    expect(await findByRole('alert')).toHaveTextContent(
      'Verification email sent. Confirm the new address to finish the change.',
    );
  });

  test('removes another active device', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'ok', current: false }),
    });

    const { getByLabelText, queryByText, user } = setup(
      <Provider store={store}>
        <UserSettings />
      </Provider>,
    );

    expect(queryByText('Other browser')).toBeInTheDocument();
    await user.click(getByLabelText('Remove device Other browser'));

    await waitFor(() => expect(queryByText('Other browser')).not.toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/settings/sessions/other-session',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  test('unlink button is disabled when it is the last sign-in method', () => {
    const customStore = configureStore({
      reducer,
      preloadedState: {
        user: {
          settings: {
            ...preloadedState.user.settings,
            githubId: 19,
            githubName: 'octocat',
            canUnlinkSocial: false,
            discordId: null,
            discordName: null,
          },
        },
      } as never,
    });

    const { getByRole } = setup(
      <Provider store={customStore}>
        <UserSettings />
      </Provider>,
    );

    expect(getByRole('button', { name: 'Unlink Github' })).toBeDisabled();
  });

  test('unlink button stays enabled when another sign-in method exists', () => {
    const customStore = configureStore({
      reducer,
      preloadedState: {
        user: {
          settings: {
            ...preloadedState.user.settings,
            githubId: 19,
            githubName: 'octocat',
            canUnlinkSocial: true,
            discordId: null,
            discordName: null,
          },
        },
      } as never,
    });

    const { getByRole } = setup(
      <Provider store={customStore}>
        <UserSettings />
      </Provider>,
    );

    expect(getByRole('button', { name: 'Unlink Github' })).toBeEnabled();
  });

  test('archives the account only after typing the confirmation text', async () => {
    const { getByRole, user } = setup(
      <Provider store={store}>
        <UserSettings />
      </Provider>,
    );
    const archiveButton = getByRole('button', { name: 'Archive account' });

    await user.click(archiveButton);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    const confirmButton = screen.getByRole('button', { name: 'Archive permanently' });
    expect(confirmButton).toBeDisabled();

    await user.type(screen.getByLabelText('Type ARCHIVE to confirm'), 'archive');
    expect(confirmButton).toBeDisabled();

    await user.clear(screen.getByLabelText('Type ARCHIVE to confirm'));
    await user.type(screen.getByLabelText('Type ARCHIVE to confirm'), 'ARCHIVE');
    expect(confirmButton).toBeEnabled();

    fetchMock.mockImplementationOnce(() => new Promise(() => {}));
    await user.click(confirmButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/settings/account',
        expect.objectContaining({ method: 'DELETE' }),
      );
      expect(confirmButton).toBeDisabled();
    });
  });
});
