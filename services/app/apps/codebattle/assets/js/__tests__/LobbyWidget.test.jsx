import React from 'react';

import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { render, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/extend-expect';
import axios from 'axios';
import { Provider } from 'react-redux';

import LobbyWidget from '../widgets/pages/lobby';
import reducers from '../widgets/slices';

import { getTestData, toLocalTime } from './helpers';

Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: jest.fn(),
});

jest.mock(
  '../widgets/components/UserInfo',
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
  '../widgets/utils/useStayScrolled',
  () => () => ({ stayScrolled: jest.fn() }),
  { virtual: true },
);

jest.mock(
  'gon',
  () => {
    const gonParams = {
      local: 'en',
      current_user: { id: 1, sound_settings: {} },
      task_tags: ['math', 'string', 'asd', 'rest'],
    };
    return { getAsset: type => gonParams[type] };
  },
  { virtual: true },
);

jest.mock('axios');

const {
  elementaryTasksFromBackend,
  easyTasksFromBackend,
  gamesPage1,
  pageInfo1,
  gamesPage2,
  pageInfo2,
  gameRepeatedOnPages,
  uniqueGamesOnPage2,
  allGames,
} = getTestData('testData.json');

const users = [{ name: 'user1', id: -4 }, { name: 'user2', id: -2 }];
const userData = { avatarUrl: '' };

axios.get.mockResolvedValue({
  data: {
    tasks: [...elementaryTasksFromBackend, ...easyTasksFromBackend],
    users,
    games: gamesPage1,
    pageInfo: pageInfo1,
    user: userData,
  },
});

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
            off: jest.fn(),
            push: jest.fn(),
            onError: jest.fn(),
          };

          return channel;
        }),
        connect: jest.fn(() => {}),
      })),
    };
  },
);

const reducer = combineReducers(reducers);

const players = [
  { user: { id: -4, name: 'Bot_1' } },
  { user: { id: -2, name: 'Bot_2' } },
];

const preloadedState = {
  lobby: {
    activeGames: [],
    loaded: true,
    presenceList: players,
    liveTournaments: [],
    completedTournaments: [],
    createGameModal: {
      show: false,
      gameOptions: {},
      opponentInfo: null,
    },
    channel: { online: true },
  },
  completedGames: {
    completedGames: [
      {
        id: -1,
        level: 'elementary',
        players,
      },
    ],
    currrentPage: null,
    totalPages: null,
  },
  user: {
    currentUserId: 1,
    users: { 1: { id: 1, isAdmin: false } },
  },
  usersInfo: {
    1: {},
    2: {},
  },
  chat: {
    users: [],
    messages: [],
    channel: { online: true },
    activeRoom: { name: 'General', targetUserId: null },
    rooms: [{ name: 'General', targetUserId: null }],
    history: [],
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
  const { getByText, findAllByText } = render(
    <Provider store={store}>
      <LobbyWidget />
    </Provider>,
  );

  const [createGameButton] = await findAllByText(/Create a Game/);

  expect(getByText(/Lobby/)).toBeInTheDocument();
  expect(getByText(/Online players: 2/)).toBeInTheDocument();
  expect(getByText(/Tournaments/)).toBeInTheDocument();
  expect(getByText(/History/)).toBeInTheDocument();
  expect(createGameButton).toBeInTheDocument();
});

test('test rendering create game dialog', async () => {
  const user = userEvent.setup();
  const { getByRole, findByText, findAllByText } = render(
    <Provider store={store}>
      <LobbyWidget />
    </Provider>,
  );

  const [createGameButton] = await findAllByText(/Create a Game/);

  await user.click(createGameButton);

  expect(await findByText(/Choose task/)).toBeInTheDocument();
  expect(getByRole('button', { name: 'task1 name' })).toBeInTheDocument();
  expect(getByRole('button', { name: 'Create battle' })).toBeInTheDocument();
});

test('test lobby history infinite scroll', async () => {
  const user = userEvent.setup();
  const {
    findByText,
    findByRole,
    queryByText,
    findByTestId,
    findAllByText,
    getByText,
  } = render(
    <Provider store={store}>
      <LobbyWidget />
    </Provider>,
  );

  const axiosSpy = jest.spyOn(axios, 'get');

  await user.click(await findByRole('tab', { name: 'History' }));

  expect(await findByText(`Total games: ${pageInfo1.totalEntries}`)).toBeInTheDocument();
  expect(axiosSpy).toHaveBeenCalledWith('/api/v1/games/completed?page_size=20');
  gamesPage1.forEach(game => expect(getByText(toLocalTime(game.finishesAt))).toBeInTheDocument());
  uniqueGamesOnPage2.forEach(game => (
    expect(queryByText(toLocalTime(game.finishesAt))).not.toBeInTheDocument()
  ));

  axiosSpy.mockResolvedValueOnce({
    data: {
      games: gamesPage2,
      pageInfo: pageInfo2,
    },
  });

  const scrollContainer = await findByTestId('scroll');

  fireEvent.scroll(scrollContainer, { target: { scrollY: 500 } });

  expect(await findAllByText(toLocalTime(gameRepeatedOnPages.finishesAt))).toHaveLength(1);
  expect(axiosSpy).toHaveBeenCalledWith('/api/v1/games/completed?page_size=20&page=2');

  for (let i = 0; i < allGames.length; i += 1) {
    expect(await findByText(toLocalTime(allGames[i].finishesAt))).toBeInTheDocument(); // eslint-disable-line
  }
});
