import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import axios from 'axios';

import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';

import reducers from '../widgets/slices';
import LobbyWidget from '../widgets/containers/LobbyWidget';

jest.mock(
  '../widgets/containers/UserInfo',
  () => function UserInfo() {
      return (
        <div>
          <ul className="list-inline">
            <li className="list-inline-item">
              Won:&nbsp;
              <b className="text-success">1</b>
            </li>
            <li className="list-inline-item">
              Lost:&nbsp;
              <b className="text-danger">10</b>
            </li>
            <li className="list-inline-item">
              Gave up:&nbsp;
              <b className="text-warning">5</b>
            </li>
          </ul>
        </div>
      );
    },
);

jest.mock(
  'gon',
  () => {
    const gonParams = {
      local: 'en',
      current_user: { id: 1, sound_settings: {} },
    };
    return { getAsset: type => gonParams[type] };
  },
  { virtual: true },
);

jest.mock('axios');
axios.get.mockResolvedValue({ data: {} });

jest.mock('react-select/async', () => () => <></>);

test('test rendering GameList', async () => {
  const reducer = combineReducers(reducers);

  const players = [{ id: -4 }, { id: -2 }];

  const preloadedState = {
    lobby: {
      activeGames: [],
      completedGames: [
        {
          id: -1,
          level: 'elementary',
          players,
        },
      ],
      loaded: true,
      presenceList: players,
      liveTournaments: [],
      completedTournaments: [],
    },
    user: {
      currentUserId: 1,
      users: { 1: { id: 1, is_admin: false } },
    },
    usersInfo: {
      1: {},
      2: {},
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
  expect(getByText(/Create a Game/)).toBeInTheDocument();
});
