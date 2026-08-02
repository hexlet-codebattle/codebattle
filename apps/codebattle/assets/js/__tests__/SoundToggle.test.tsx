import { configureStore } from '@reduxjs/toolkit';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { Provider } from 'react-redux';

import SoundToggle from '../widgets/components/SoundToggle';
import sound from '../widgets/lib/sound';

vi.mock('../widgets/lib/sound', () => ({
  default: { toggle: vi.fn() },
}));

const reducer = (
  state = { user: { settings: { mute: false } } },
  action: { type: string; payload?: boolean },
) =>
  action.type === 'user/setMuteSound'
    ? { user: { settings: { mute: Boolean(action.payload) } } }
    : state;

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

test('toggles sound from the profile menu', async () => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true });
  vi.stubGlobal('fetch', fetchMock);
  const store = configureStore({ reducer });
  const user = userEvent.setup();

  render(
    <Provider store={store}>
      <SoundToggle />
    </Provider>,
  );

  const toggle = screen.getByRole('button', { name: 'Mute sound' });
  expect(toggle).toHaveAttribute('aria-pressed', 'false');
  expect(screen.getByText('On')).toBeInTheDocument();

  await user.click(toggle);

  expect(sound.toggle).toHaveBeenCalledWith(0);
  expect(screen.getByRole('button', { name: 'Turn sound on' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(screen.getByText('Off')).toBeInTheDocument();

  await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
  expect(fetchMock).toHaveBeenCalledWith(
    '/api/v1/settings',
    expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({ sound_settings: { muted: true } }),
    }),
  );
});

test('restores the previous state when the preference cannot be saved', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
  const store = configureStore({ reducer });
  const user = userEvent.setup();

  render(
    <Provider store={store}>
      <SoundToggle />
    </Provider>,
  );

  await user.click(screen.getByRole('button', { name: 'Mute sound' }));

  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Mute sound' })).toHaveAttribute(
      'aria-pressed',
      'false',
    ),
  );
  expect(sound.toggle).toHaveBeenNthCalledWith(1, 0);
  expect(sound.toggle).toHaveBeenNthCalledWith(2, undefined);
});
