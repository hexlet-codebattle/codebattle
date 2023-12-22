import React from 'react';

import '@testing-library/jest-dom/extend-expect';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import { Provider } from 'react-redux';

import UserSettings from '../widgets/pages/settings';
import reducers from '../widgets/slices';

jest.mock('@fortawesome/react-fontawesome', () => ({
  FontAwesomeIcon: 'img',
}));

jest.mock('calcite-react/Slider', () => 'input');

jest.mock('axios');

const reducer = combineReducers(reducers);

const preloadedState = {
  user: {
    settings: {
      soundSettings: {
        type: 'standart',
        level: 6,
      },
      id: 11,
      name: 'Diman',
      lang: 'ts',
      avatarUrl: '/assets/images/logo.svg',
      discordName: null,
      discordId: null,
      error: '',
    },
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

  test('successfull user settings update', async () => {
    const settingUpdaterSpy = jest.spyOn(axios, 'patch').mockResolvedValueOnce({ data: {} });
    const {
      getByRole, getByLabelText, getByTestId, user,
    } = setup(
      <Provider store={store}>
        <UserSettings />
      </Provider>,
    );
    const submitButton = getByLabelText('SubmitForm');
    const nameInput = getByTestId('nameInput');
    const langSelect = getByTestId('langSelect');

    await user.clear(nameInput);
    await user.type(nameInput, 'Dmitry');
    await user.selectOptions(langSelect, 'Javascript');
    await user.click(submitButton);

    await waitFor(() => {
      expect(settingUpdaterSpy).toHaveBeenCalledWith(expect.anything(), {
        name: 'Dmitry',
        lang: 'js',
        sound_settings: {
          level: 6,
          type: 'standart',
        },
      }, expect.anything());
      expect(getByRole('alert')).toHaveClass('alert-success');
    });
  });

  test('failed user settings update', async () => {
    const {
      getByTestId, getByLabelText, findByRole, findByText, user,
    } = setup(
      <Provider store={store}>
        <UserSettings />
      </Provider>,
    );
    const submitButton = getByLabelText('SubmitForm');
    const nameInput = getByTestId('nameInput');

    await user.clear(nameInput);

    expect(await findByText(/Field can't be empty/i)).toBeInTheDocument();
    expect(submitButton).toBeDisabled();

    await user.type(nameInput, '   ');

    expect(await findByText(/name must be a trimmed string/i)).toBeInTheDocument();
    expect(submitButton).toBeDisabled();

    axios.patch.mockRejectedValueOnce({
      response: {
        data: {
          errors: {
            name: ['has already been taken'],
          },
        },
      },
    });

    await user.clear(nameInput);
    await user.type(nameInput, 'ExistingUserName');

    expect(submitButton).toBeEnabled();

    await user.click(submitButton);

    expect(await findByText(/Has already been taken/i)).toBeInTheDocument();

    axios.patch.mockRejectedValueOnce({ response: undefined, message: 'Network Error' });

    await user.clear(nameInput);
    await user.type(nameInput, 'CoolUserName');
    await user.click(submitButton);

    expect(await findByRole('alert')).toHaveClass('alert-danger');
  });
});
