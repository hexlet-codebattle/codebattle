import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/extend-expect';
import axios from 'axios';
import omit from 'lodash/omit';

import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';

import * as lobbyMiddlewares from '../widgets/middlewares/Lobby';
import * as invitesMiddleware from '../widgets/middlewares/Invite';
import reducers from '../widgets/slices';
import LobbyWidget from '../widgets/pages/lobby';
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
} = getTestData('testData.json');

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
  '../widgets/middlewares/Invite',
  () => {
    const originalModule = jest.requireActual('../widgets/middlewares/Invite');

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
  const {
    getByText,
    findAllByText,
  } = render(
    <Provider store={store}>
      <LobbyWidget />
    </Provider>,
  );

  const [createGameButton] = await findAllByText(/Create a Game/);

  expect(getByText(/Lobby/)).toBeInTheDocument();
  expect(getByText(/Online players: 2/)).toBeInTheDocument();
  expect(getByText(/Tournaments/)).toBeInTheDocument();
  expect(getByText(/Completed Games/)).toBeInTheDocument();
  expect(createGameButton).toBeInTheDocument();
});

describe('test task choice', () => {
  beforeEach(() => {
    store = configureStore({
      reducer,
      preloadedState,
    });
  });

  test('choose a task', async () => {
    const user = userEvent.setup();
    const {
      getByText,
      getByRole,
      findByRole,
      findAllByText,
      getByTitle,
    } = render(
      <Provider store={store}>
        <LobbyWidget />
      </Provider>,
    );
    const [createGameButton] = await findAllByText('Create a Game');
    // const createGameButton = getByRole('button', { name: 'Create a Game' });

    await user.click(createGameButton);

    expect(getByText(/Choose task/)).toBeInTheDocument();
    expect(await findByRole('button', { name: 'task1 name' })).toBeInTheDocument();

    await user.click(getByRole('button', { name: 'Create battle' }));

    const params = {
      level: 'elementary',
      opponent_type: 'other_user',
      timeout_seconds: 480,
      task_id: null,
      task_tags: [],
    };

    expect(lobbyMiddlewares.createGame).toHaveBeenCalledWith(params);

    await user.click(createGameButton);
    await user.click(await findByRole('button', { name: 'task1 name' }));
    await user.click(getByRole('button', { name: 'Create battle' }));

    const paramsWithChosenTask = {
      ...params,
      task_id: 1,
    };
    expect(lobbyMiddlewares.createGame).toHaveBeenCalledWith(paramsWithChosenTask);

    // await user.click(await findByRole('button', { name: 'Create a Game' }));
    await user.click(createGameButton);
    await user.click(await findByRole('button', { name: 'math' }));
    await user.click(getByRole('button', { name: 'string' }));
    await user.click(getByRole('button', { name: 'Create battle' }));

    const paramsWithChosenTags = {
      ...params,
      task_tags: ['math', 'string'],
    };
    expect(lobbyMiddlewares.createGame).toHaveBeenCalledWith(paramsWithChosenTags);

    // await user.click(await findByRole('button', { name: 'Create a Game' }));
    await user.click(createGameButton);
    await user.click(getByTitle('easy'));
    await user.click(await findByRole('button', { name: 'task7 name' }));
    await user.click(getByRole('button', { name: 'Create battle' }));

    const paramsWithChosenTaskAndChangedLevel = {
      ...params,
      level: 'easy',
      task_id: 7,
    };
    expect(lobbyMiddlewares.createGame).toHaveBeenCalledWith(paramsWithChosenTaskAndChangedLevel);

    await user.click(createGameButton);
    // await user.click(await findByRole('button', { name: 'Create a Game' }));
    await user.click(getByRole('button', { name: 'With a friend' }));

    expect(getByRole('button', { name: 'Create invite' })).toBeDisabled();

    await user.click(await findByRole('button', { name: 'user1' }));

    expect(getByRole('button', { name: 'Create invite' })).toBeEnabled();

    await user.click(getByRole('button', { name: 'Create invite' }));

    const paramsWithOpponent = {
      ...omit(params, ['opponent_type']),
      recipient_id: -4,
      recipient_name: 'user1',
    };
    expect(invitesMiddleware.createInvite).toHaveBeenCalledWith(paramsWithOpponent);

    await user.click(createGameButton);
    // await user.click(await findByRole('button', { name: 'Create a Game' }));
    await user.click(getByRole('button', { name: 'With a friend' }));
    await user.click(await findByRole('button', { name: 'user1' }));
    await user.click(getByRole('button', { name: 'task1 name' }));
    await user.click(getByRole('button', { name: 'Create invite' }));

    const paramsWithOpponentAndChosenTask = {
      ...paramsWithOpponent,
      task_id: 1,
    };
    expect(invitesMiddleware.createInvite).toHaveBeenCalledWith(paramsWithOpponentAndChosenTask);
  }, 12000);

  test('filter tasks by level', async () => {
    const user = userEvent.setup();
    const {
      findByRole,
      getByTitle,
      queryByRole,
      findAllByText,
    } = render(
      <Provider store={store}>
        <LobbyWidget />
      </Provider>,
    );

    const [createGameButton] = await findAllByText('Create a Game');
    await user.click(createGameButton);
    // await user.click(await findByRole('button', { name: 'Create a Game' }));

    /*
    jest doesn't process properly async/await inside array.forEach()
    (see https://gist.github.com/joeytwiddle/37d2085425c049629b80956d3c618971)
  */
    for (let i = 0; i < elementaryTasksFromBackend.length; i += 1) {
      expect(await findByRole('button', { name: elementaryTasksFromBackend[i].name })).toBeInTheDocument(); // eslint-disable-line
    }
    easyTasksFromBackend.forEach(task => expect(queryByRole('button', { name: task.name })).not.toBeInTheDocument());

    await user.click(getByTitle('easy'));

    for (let i = 0; i < easyTasksFromBackend.length; i += 1) {
      expect(await findByRole('button', { name: easyTasksFromBackend[i].name })).toBeInTheDocument(); // eslint-disable-line
    }
    elementaryTasksFromBackend.forEach(task => expect(queryByRole('button', { name: task.name })).not.toBeInTheDocument());
  });

  test('filter tasks by tags', async () => {
    const user = userEvent.setup();
    const {
      getByRole,
      findByRole,
      findAllByText,
      queryByRole,
    } = render(
      <Provider store={store}>
        <LobbyWidget />
      </Provider>,
    );

    const [createGameButton] = await findAllByText('Create a Game');
    await user.click(createGameButton);
    // await user.click(await findByRole('button', { name: 'Create a Game' }));

    const mathTag = await findByRole('button', { name: 'math' });
    const stringTag = getByRole('button', { name: 'string' });
    const asdTag = getByRole('button', { name: 'asd' });
    const restTag = getByRole('button', { name: 'rest' });

    await user.click(restTag);

    await waitFor(() => {
      expect(mathTag).toBeEnabled();
      expect(stringTag).toBeDisabled();
      expect(asdTag).toBeDisabled();

      tasksMatchingRestTags.forEach(task => expect(getByRole('button', { name: task.name })).toBeInTheDocument());

      tasksUnsuitableForRestTags.forEach(task => (
        expect(queryByRole('button', { name: task.name })).not.toBeInTheDocument()
      ));
    });

    await user.click(restTag);

    await waitFor(() => {
      expect(mathTag).toBeEnabled();
      expect(stringTag).toBeEnabled();
      expect(asdTag).toBeEnabled();

      elementaryTasksFromBackend.forEach(task => expect(getByRole('button', { name: task.name })).toBeInTheDocument());
    });

    await user.click(mathTag);

    await waitFor(() => {
      expect(stringTag).toBeEnabled();
      expect(asdTag).toBeDisabled();
      expect(restTag).toBeEnabled();
      tasksMatchingMathTag.forEach(task => expect(getByRole('button', { name: task.name })).toBeInTheDocument());
      tasksUnsuitableForMathTag.forEach(task => (
        expect(queryByRole('button', { name: task.name })).not.toBeInTheDocument()
      ));
    });

    await user.click(stringTag);

    await waitFor(() => {
      expect(restTag).toBeDisabled();
      expect(asdTag).toBeDisabled();
      tasksMatchingMathAndStringTags.forEach(task => expect(getByRole('button', { name: task.name })).toBeInTheDocument());
      tasksUnsuitableForMathAndStringTags.forEach(task => (
        expect(queryByRole('button', { name: task.name })).not.toBeInTheDocument()
      ));
    });

    await user.click(mathTag);
    await user.click(stringTag);

    await waitFor(() => {
      expect(asdTag).toBeEnabled();
      expect(restTag).toBeEnabled();
      elementaryTasksFromBackend.forEach(task => expect(getByRole('button', { name: task.name })).toBeInTheDocument());
    });
  });

  test('filter tasks by name', async () => {
    const user = userEvent.setup();
    const {
      getByRole,
      findByRole,
      findAllByText,
      queryByRole,
    } = render(
      <Provider store={store}>
        <LobbyWidget />
      </Provider>,
    );

    const [createGameButton] = await findAllByText('Create a Game');
    await user.click(createGameButton);
    // await user.click(await findByRole('button', { name: 'Create a Game' }));

    await user.click(await findByRole('button', { name: 'filter tasks by name' }));

    await waitFor(() => {
      tasksFilteredByName.forEach(task => expect(getByRole('button', { name: task.name })).toBeInTheDocument());
      tasksEliminatedByName.forEach(task => expect(queryByRole('button', { name: task.name })).not.toBeInTheDocument());
    });
  });

  test('filter tasks by name and tags', async () => {
    const user = userEvent.setup();
    const {
      getByRole,
      findByRole,
      findAllByText,
      queryByRole,
    } = render(
      <Provider store={store}>
        <LobbyWidget />
      </Provider>,
    );

    const [createGameButton] = await findAllByText('Create a Game');
    await user.click(createGameButton);
    // await user.click(await findByRole('button', { name: 'Create a Game' }));
    await user.click(await findByRole('button', { name: 'filter tasks by name' }));
    await user.click(getByRole('button', { name: 'math' }));

    tasksFilteredByNameAndTag.forEach(task => expect(queryByRole('button', { name: task.name })).toBeInTheDocument());
    tasksEliminatedByNameAndTag.forEach(task => (
      expect(queryByRole('button', { name: task.name })).not.toBeInTheDocument()
    ));
  });
});

test('test lobby completed games infinite scroll', async () => {
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

  await user.click(await findByRole('tab', { name: 'Completed Games' }));

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
