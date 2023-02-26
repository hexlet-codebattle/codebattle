import React from 'react';
import '@testing-library/jest-dom/extend-expect';
import {
  screen, render, fireEvent, waitFor,
} from '@testing-library/react';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import axios from 'axios';

import reducers from '../widgets/slices';
import UserSettings from '../widgets/containers/UserSettings';
import UserSettingsForm from '../widgets/components/User/UserSettingsForm';
import languages from '../widgets/config/languages';

jest.mock('@fortawesome/react-fontawesome', () => ({
  FontAwesomeIcon: 'img',
}));

jest.mock('axios');

jest.useFakeTimers();

const reducer = combineReducers(reducers);

const preloadedState = {
  userSettings: {
    sound_settings: {
      type: 'standart',
      level: 6,
    },
    id: 11,
    name: 'Diman',
    lang: 'ts',
    avatar_url: '/assets/images/logo.svg',
    discord_name: null,
    discord_id: null,
    error: '',
  },
};
const store = configureStore({
  reducer,
  preloadedState,
});
jest.mock(
  'gon',
  () => {
    const gonParams = {
      local: 'en',
      current_user: { sound_settings: {} },
      game_id: 10,
    };
    return { getAsset: type => gonParams[type] };
  },
  { virtual: true },
);

const settings = Object.keys(languages);

const vdom = () => render(
  <Provider store={store}>
    <UserSettings />
  </Provider>,
);
describe('UserSettings test cases', () => {
  it('render main component', () => {
    const { getByText } = vdom();
    expect(getByText(/settings/i)).toBeInTheDocument();
  });
  it('show success notification', async () => {
    const settingUpdaterSpy = jest.spyOn(axios, 'patch').mockResolvedValueOnce({ data: {} });
    const {
      getByRole,
    } = vdom();
    const save = getByRole('button', { name: /save/i });
    const alert = getByRole('alert');

    fireEvent.change(screen.getByLabelText(/your name/i), {
      target: { value: 'Dmitry' },
    });
    fireEvent.click(save);

    await waitFor(() => {
      expect(settingUpdaterSpy).toHaveBeenCalled();
      expect(alert).toHaveClass('alert-success');
    });
  });

  test.each(settings)('editing profile test with lang %s', async lang => {
    const handleSubmit = jest.fn();
    render(
      <UserSettingsForm
        onSubmit={handleSubmit}
        settings={preloadedState.userSettings}
      />,
    );
    fireEvent.change(screen.getByLabelText(/your name/i), {
      target: { value: 'Dmitry' },
    });
    fireEvent.change(screen.getByTestId('langSelect'), {
      target: { value: lang },
    });
    const saveBtn = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveBtn);
    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalled();
      expect(handleSubmit).toHaveBeenCalledWith({
        name: 'Dmitry',
        lang,
        sound_settings: {
          level: 6,
          type: 'standart',
        },
      }, expect.anything());
    });
  });
});
