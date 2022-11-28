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
import { getTestData, toLocalTime } from './helpers';

Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: jest.fn(),
});

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
  tasksMatchingRestTags,
  tasksUnsuitableForRestTags,
  tasksMatchingMathTag,
  tasksUnsuitableForMathTag,
  tasksMatchingMathAndStringTags,
  tasksUnsuitableForMathAndStringTags,
  tasksFilteredByName,
  tasksEliminatedByName,
  tasksFilteredByNameAndTag,
  tasksEliminatedByNameAndTag,
  gamesPage1,
  pageInfo1,
  gamesPage2,
  pageInfo2,
  gameRepeatedOnPages,
  uniqueGamesOnPage2,
  allGames,
} = getTestData();

const users = [{ name: 'user1', id: -4 }, { name: 'user2', id: -2 }];

axios.get.mockResolvedValue({
  data: {
    tasks: [...elementaryTasksFromBackend, ...easyTasksFromBackend],
    users,
    games: gamesPage1,
    pageInfo: pageInfo1,
  },
});

jest.mock('react-select');
jest.mock('react-select/async');
/*
  AsyncSelect and Select component mock is made by means of the series of buttons.
  Each button represents one option.
  Clicking the buttons you simulate a choice of the options in the AsyncSelect component.
  Button "filter tasks by name" simulates a user to type 'name' into the Select
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
  completedGames: {
    completedGames: [
      {
        id: -1,
        level: 'elementary',
        players,
      },
    ],
    nextPage: null,
    totalPages: null,
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

describe('test task choice', () => {
  beforeEach(() => {
    store = configureStore({
      reducer,
      preloadedState,
    });
  });

  test('choose a task', async () => {
    const {
      getByText,
      getByRole,
      findByRole,
      getByTitle,
    } = render(
      <Provider store={store}>
        <LobbyWidget />
      </Provider>,
    );

    const createGameButton = getByRole('button', { name: 'Create a Game' });

    fireEvent.click(createGameButton);

    expect(getByText(/Choose task/)).toBeInTheDocument();

    fireEvent.click(getByRole('button', { name: 'Create Battle' }));

    const params = {
      level: 'elementary',
      opponent_type: 'other_user',
      timeout_seconds: 480,
      task_id: null,
      task_tags: [],
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
    fireEvent.click(await findByRole('button', { name: 'math' }));
    fireEvent.click(getByRole('button', { name: 'string' }));
    fireEvent.click(getByRole('button', { name: 'Create Battle' }));

    const paramsWithChosenTags = {
      ...params,
      task_tags: ['math', 'string'],
    };
    expect(lobbyMiddlewares.createGame).toHaveBeenCalledWith(paramsWithChosenTags);

    fireEvent.click(await findByRole('button', { name: 'Create a Game' }));
    fireEvent.click(getByTitle('easy'));
    fireEvent.click(await findByRole('button', { name: 'task7 name' }));
    fireEvent.click(getByRole('button', { name: 'Create Battle' }));

    const paramsWithChosenTaskAndChangedLevel = {
      ...params,
      level: 'easy',
      task_id: 7,
    };
    expect(lobbyMiddlewares.createGame).toHaveBeenCalledWith(paramsWithChosenTaskAndChangedLevel);

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
  }, 6000);

  test('filter tasks by level', async () => {
    const {
      findByRole,
      getByTitle,
      queryByRole,
    } = render(
      <Provider store={store}>
        <LobbyWidget />
      </Provider>,
    );

    fireEvent.click(await findByRole('button', { name: 'Create a Game' }));

    /*
    jest doesn't process properly async/await inside array.forEach()
    (see https://gist.github.com/joeytwiddle/37d2085425c049629b80956d3c618971)
  */
    for (let i = 0; i < elementaryTasksFromBackend.length; i += 1) {
      expect(await findByRole('button', { name: elementaryTasksFromBackend[i].name })).toBeInTheDocument(); // eslint-disable-line
    }
    easyTasksFromBackend.forEach(task => expect(queryByRole('button', { name: task.name })).not.toBeInTheDocument());

    fireEvent.click(getByTitle('easy'));

    for (let i = 0; i < easyTasksFromBackend.length; i += 1) {
      expect(await findByRole('button', { name: easyTasksFromBackend[i].name })).toBeInTheDocument(); // eslint-disable-line
    }
    elementaryTasksFromBackend.forEach(task => expect(queryByRole('button', { name: task.name })).not.toBeInTheDocument());
  });

  test('filter tasks by tags', async () => {
    const {
      getByRole,
      findByRole,
      queryByRole,
    } = render(
      <Provider store={store}>
        <LobbyWidget />
      </Provider>,
    );

    fireEvent.click(await findByRole('button', { name: 'Create a Game' }));

    const mathTag = await findByRole('button', { name: 'math' });
    const stringTag = getByRole('button', { name: 'string' });
    const asdTag = getByRole('button', { name: 'asd' });
    const restTag = getByRole('button', { name: 'rest' });

    fireEvent.click(restTag);

    expect(mathTag).toBeEnabled();
    expect(stringTag).toBeDisabled();
    expect(asdTag).toBeDisabled();

    tasksMatchingRestTags.forEach(task => expect(getByRole('button', { name: task.name })).toBeInTheDocument());

    tasksUnsuitableForRestTags.forEach(task => (
      expect(queryByRole('button', { name: task.name })).not.toBeInTheDocument()
    ));

    fireEvent.click(restTag);

    expect(mathTag).toBeEnabled();
    expect(stringTag).toBeEnabled();
    expect(asdTag).toBeEnabled();

    elementaryTasksFromBackend.forEach(task => expect(getByRole('button', { name: task.name })).toBeInTheDocument());

    fireEvent.click(mathTag);

    expect(stringTag).toBeEnabled();
    expect(asdTag).toBeDisabled();
    expect(restTag).toBeEnabled();
    tasksMatchingMathTag.forEach(task => expect(getByRole('button', { name: task.name })).toBeInTheDocument());
    tasksUnsuitableForMathTag.forEach(task => (
      expect(queryByRole('button', { name: task.name })).not.toBeInTheDocument()
    ));

    fireEvent.click(stringTag);

    expect(restTag).toBeDisabled();
    expect(asdTag).toBeDisabled();
    tasksMatchingMathAndStringTags.forEach(task => expect(getByRole('button', { name: task.name })).toBeInTheDocument());
    tasksUnsuitableForMathAndStringTags.forEach(task => (
      expect(queryByRole('button', { name: task.name })).not.toBeInTheDocument()
    ));

    fireEvent.click(mathTag);
    fireEvent.click(stringTag);

    expect(asdTag).toBeEnabled();
    expect(restTag).toBeEnabled();
    elementaryTasksFromBackend.forEach(task => expect(getByRole('button', { name: task.name })).toBeInTheDocument());
  });

  test('filter tasks by name', async () => {
    const {
      getByRole,
      findByRole,
      queryByRole,
    } = render(
      <Provider store={store}>
        <LobbyWidget />
      </Provider>,
    );

    fireEvent.click(await findByRole('button', { name: 'Create a Game' }));

    fireEvent.click(await findByRole('button', { name: 'filter tasks by name' }));

    tasksFilteredByName.forEach(task => expect(getByRole('button', { name: task.name })).toBeInTheDocument());
    tasksEliminatedByName.forEach(task => expect(queryByRole('button', { name: task.name })).not.toBeInTheDocument());
  });

  test('filter tasks by name and tags', async () => {
    const {
      getByRole,
      findByRole,
      queryByRole,
    } = render(
      <Provider store={store}>
        <LobbyWidget />
      </Provider>,
    );

    fireEvent.click(await findByRole('button', { name: 'Create a Game' }));
    fireEvent.click(await findByRole('button', { name: 'filter tasks by name' }));
    fireEvent.click(getByRole('button', { name: 'math' }));

    tasksFilteredByNameAndTag.forEach(task => expect(queryByRole('button', { name: task.name })).toBeInTheDocument());
    tasksEliminatedByNameAndTag.forEach(task => (
      expect(queryByRole('button', { name: task.name })).not.toBeInTheDocument()
    ));
  });
});

test('test lobby completed games infinite scroll', async () => {
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

  fireEvent.click(await findByRole('tab', { name: 'Completed Games' }));

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
