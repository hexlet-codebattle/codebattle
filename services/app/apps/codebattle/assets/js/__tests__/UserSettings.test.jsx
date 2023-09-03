import React from 'react';

import '@testing-library/jest-dom/extend-expect';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { Provider } from 'react-redux';

import languages from '../widgets/config/languages';
import UserSettings from '../widgets/pages/settings';
import UserSettingsForm from '../widgets/pages/settings/UserSettingsForm';
import reducers from '../widgets/slices';

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

describe('UserSettings test cases', () => {
  function setup(jsx) {
    return {
      user: userEvent.setup(),
      ...render(jsx),
    };
  }

  test('render main component', () => {
    const { getByText } = setup(
      <Provider store={store}>
        <UserSettings />
      </Provider>,
    );
    expect(getByText(/settings/i)).toBeInTheDocument();
  });

  // eslint-disable-next-line jest/no-disabled-tests
  test.skip('show success notification', async () => {
    const settingUpdaterSpy = jest.spyOn(axios, 'patch').mockResolvedValueOnce({ data: {} });
    const {
      getByRole,
      getByLabelText,
      getByTestId,
      user,
    } = setup(
      <Provider store={store}>
        <UserSettings />
      </Provider>,
    );
    const submitButton = getByLabelText('SubmitForm');
    const alert = getByRole('alert');

    await userEvent.type(getByTestId('nameInput'), 'Dmitry');
    await user.click(submitButton);

    await waitFor(() => {
      expect(settingUpdaterSpy).toHaveBeenCalled();
      expect(alert).toHaveClass('alert-success');
    });
  });

  test.skip.each(settings)('editing profile test with lang %s', async lang => {
    const handleSubmit = jest.fn();
    const {
      user,
      getByTestId,
      getByLabelText,
    } = setup(
      <UserSettingsForm
        onSubmit={handleSubmit}
        settings={preloadedState.userSettings}
      />,
    );

    await userEvent.type(getByTestId('nameInput'), 'Dmitry');
    await userEvent.type(getByTestId('langSelect'), lang);

    const submitButton = getByLabelText('SubmitForm');
    await user.click(submitButton);

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

  test('show error when username is not trimmed string or it is empty', async () => {
    const {
      getByText, getByTestId, getByLabelText,
    } = setup(
      <Provider store={store}>
        <UserSettings />
      </Provider>,
    );

    const submitButton = getByLabelText('SubmitForm');

    userEvent.clear(getByTestId('nameInput'));

    expect(submitButton).toBeEnabled();

    userEvent.click(submitButton);

    await waitFor(() => {
      expect(getByText(/Field can't be empty/i)).toBeInTheDocument();
    });

    userEvent.type(getByTestId('nameInput'), '   ');

    await waitFor(() => {
      expect(getByText(/name must be a trimmed string/i)).toBeInTheDocument();
    });
  });
});
