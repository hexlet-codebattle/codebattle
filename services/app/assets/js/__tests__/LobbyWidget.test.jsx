import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import axios from 'axios';

import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';

import reducers from '../widgets/slices';
import LobbyWidget from '../widgets/containers/LobbyWidget';

jest.mock(
  'gon',
  () => {
    const gonParams = { local: 'en', current_user: { sound_settings: {} } };
    return { getAsset: type => gonParams[type] };
  },
  { virtual: true },
);

jest.mock('axios');
axios.get.mockResolvedValue({ data: {} });

jest.mock('react-select/async', () => () => <></>);

test('test rendering GameList', async () => {
  const reducer = combineReducers(reducers);

  const preloadedState = {
    lobby: {
      activeGames: [],
      completedGames: [
        { id: -1, level: 'elementary', players: [{ id: -4 }, { id: -2 }] },
      ],
      loaded: true,
      presenceList: [{}, {}],
      liveTournaments: [],
    },
  };
  const store = configureStore({
    reducer,
    preloadedState,
  });

  const { getByText } = render(
    <Provider store={store}>
      <LobbyWidget />
    </Provider>,
  );

  expect(getByText(/Lobby/)).toBeInTheDocument();
  expect(getByText(/Online players: 2/)).toBeInTheDocument();
  expect(getByText(/Tournaments/)).toBeInTheDocument();
  expect(getByText(/Completed Games/)).toBeInTheDocument();
  expect(getByText(/Create Game/)).toBeInTheDocument();
});
