import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import axios from 'axios';
import _ from 'lodash';

import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';

import * as lobbyMiddlewares from '../widgets/middlewares/Lobby';
import * as mainMiddlewares from '../widgets/middlewares/Main';
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
const tasks = [
  { name: 'task1 name', id: 1 },
  { name: 'task2 name', id: 2 },
  { name: 'task3 filtered', id: 3 },
];
const users = [{ name: 'user1', id: -4 }, { name: 'user2', id: -2 }];
axios.get.mockResolvedValue({ data: { tasks, users } });

jest.mock('react-select');
jest.mock('react-select/async');
/*
  AsyncSelect and Select component mock is made by means of the series of buttons.
  Each button represents one option.
  Clicking the buttons you simulate a choice of the options in the AsyncSelect component.
*/

jest.mock(
  '../widgets/middlewares/Lobby',
  () => {
    const originalModule = jest.requireActual('../widgets/middlewares/Lobby');

    return {
      __esModule: true,
      ...originalModule,
      createGame: jest.fn(),
    };
  },
);

jest.mock(
  '../widgets/middlewares/Main',
  () => {
    const originalModule = jest.requireActual('../widgets/middlewares/Main');

    return {
      __esModule: true,
      ...originalModule,
      createInvite: jest.fn(() => ({ type: '', payload: {} })),
    };
  },
);

jest.mock(
  'phoenix',
  () => {
    const originalModule = jest.requireActual('phoenix');

    return {
      __esModule: true,
      ...originalModule,
      Socket: jest.fn().mockImplementation(() => ({
        channel: jest.fn(() => {
          const channel = {
            join: jest.fn(() => channel),
            receive: jest.fn(),
            on: jest.fn(),
            push: jest.fn(),
          };

          return channel;
        }),
        connect: jest.fn(() => {}),
      })),
    };
  },
);

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
    createGameModal: {
      show: false,
      gameOptions: {},
      opponentInfo: null,
    },
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

let store;

beforeEach(() => {
  store = configureStore({
    reducer,
    preloadedState,
  });
});

test('test rendering GameList', async () => {
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

test('test task choice', async () => {
  const {
    getByText,
    getByRole,
    findByText,
    findByRole,
  } = render(
    <Provider store={store}>
      <LobbyWidget />
    </Provider>,
  );

  const createGameButton = getByRole('button', { name: 'Create a Game' });

  fireEvent.click(createGameButton);

  expect(getByText(/Choose task/)).toBeInTheDocument();
  expect(await findByText(/random task/)).toBeInTheDocument();
  expect(getByText(/task1 name/)).toBeInTheDocument();
  expect(getByText(/task2 name/)).toBeInTheDocument();

  fireEvent.click(getByRole('button', { name: 'Create Battle' }));

  const params = {
    level: 'elementary',
    opponent_type: 'other_user',
    timeout_seconds: 480,
    task_id: null,
  };

  expect(lobbyMiddlewares.createGame).toHaveBeenCalledWith(params);

  fireEvent.click(await findByRole('button', { name: 'Create a Game' }));
  fireEvent.click(await findByRole('button', { name: 'task1 name' }));
  fireEvent.click(getByRole('button', { name: 'Create Battle' }));

  const paramsWithChosenTask = {
    ...params,
    task_id: 1,
  };
  expect(lobbyMiddlewares.createGame).toHaveBeenCalledWith(paramsWithChosenTask);

  fireEvent.click(await findByRole('button', { name: 'Create a Game' }));
  fireEvent.click(getByRole('button', { name: 'With a friend' }));
  fireEvent.click(await findByRole('button', { name: 'user1' }));
  fireEvent.click(getByRole('button', { name: 'Create Invite' }));

  const paramsWithOpponent = {
    ..._.omit(params, ['opponent_type']),
    recipient_id: -4,
  };
  expect(mainMiddlewares.createInvite).toHaveBeenCalledWith(paramsWithOpponent);

  fireEvent.click(await findByRole('button', { name: 'Create a Game' }));
  fireEvent.click(getByRole('button', { name: 'With a friend' }));
  fireEvent.click(await findByRole('button', { name: 'user1' }));
  fireEvent.click(getByRole('button', { name: 'task1 name' }));
  fireEvent.click(getByRole('button', { name: 'Create Invite' }));

  const paramsWithOpponentAndChosenTask = {
    ...paramsWithOpponent,
    task_id: 1,
  };
  expect(mainMiddlewares.createInvite).toHaveBeenCalledWith(paramsWithOpponentAndChosenTask);

  fireEvent.click(await findByRole('button', { name: 'Create a Game' }));

  const firstTaskOpt = await findByRole('button', { name: 'task1 name' });
  const secondTaskOpt = getByRole('button', { name: 'task2 name' });
  const thirdTaskOpt = getByRole('button', { name: 'task3 filtered' });

  fireEvent.click(getByRole('button', { name: 'filter tasks by name' }));

  expect(firstTaskOpt).toBeInTheDocument();
  expect(secondTaskOpt).toBeInTheDocument();
  expect(thirdTaskOpt).not.toBeInTheDocument();
},
8000);
