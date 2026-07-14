import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import noop from 'lodash/noop';
import omit from 'lodash/omit';
import React, { type ReactElement } from 'react';
import { Provider } from 'react-redux';

import * as invitesMiddleware from '../widgets/middlewares/Invite';
import * as lobbyMiddlewares from '../widgets/middlewares/Lobby';
import CreateGameDialog from '../widgets/pages/lobby/CreateGameDialog';
import reducers from '../widgets/slices';

import { getTestData } from './helpers';

vi.mock('gon', () => {
  const gonParams = {
    local: 'en',
    current_user: { id: 1, sound_settings: {} },
    task_tags: ['math', 'string', 'asd', 'rest'],
  };
  return { default: { getAsset: (type: keyof typeof gonParams) => gonParams[type] } };
});

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
} = getTestData('testData.json');

const users = [
  { name: 'user1', id: -4 },
  { name: 'user2', id: -2 },
];
const userData = { avatarUrl: '' };

vi.mock('react-select', async () => await import('../__mocks__/react-select'));
vi.mock('react-select/async', async () => await import('../__mocks__/react-select/async'));
/*
  AsyncSelect and Select component mock is made by means of the series of buttons.
  Each button represents one option.
  Clicking the buttons you simulate a choice of the options in the AsyncSelect component.
  Button "filter tasks by name" simulates a user to type 'name' into the Select
*/

vi.mock('../widgets/middlewares/Lobby', async () => {
  const originalModule = await vi.importActual('../widgets/middlewares/Lobby');

  return {
    __esModule: true,
    ...originalModule,
    createGame: vi.fn(),
  };
});

vi.mock('../widgets/middlewares/Invite', async () => {
  const originalModule = await vi.importActual('../widgets/middlewares/Invite');

  return {
    __esModule: true,
    ...originalModule,
    createInvite: vi.fn(() => ({ type: '', payload: {} })),
  };
});

const reducer = combineReducers(reducers);

const preloadedState = {
  user: {
    currentUserId: 1,
  },
};

const store = configureStore({
  reducer,
  preloadedState: preloadedState as never,
});

const setup = (jsx: ReactElement) => ({
  user: userEvent.setup(),
  ...render(jsx),
});

const defaultGameParams = {
  level: 'elementary',
  opponent_type: 'other_user',
  timeout_seconds: 480,
  task_id: null,
  task_tags: [],
};

let vdom: ReactElement;

beforeAll(() => {
  globalThis.fetch = vi.fn((url: string | URL | Request) => {
    if (String(url).includes('/api/v1/tasks')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          tasks: [...elementaryTasksFromBackend, ...easyTasksFromBackend],
        }),
      });
    }

    return Promise.resolve({
      ok: true,
      json: async () => ({
        users,
        user: userData,
      }),
    });
  }) as unknown as typeof fetch;

  vdom = (
    <Provider store={store}>
      <CreateGameDialog hideModal={noop} />
    </Provider>
  );
});

describe('test create game', () => {
  test('with random task with default parameters', async () => {
    const { getByRole, user } = setup(vdom);

    await user.click(getByRole('button', { name: 'Create battle' }));

    expect(lobbyMiddlewares.createGame).toHaveBeenCalledWith(defaultGameParams);
  });

  test('with chosen task', async () => {
    const { findByRole, getByRole, user } = setup(vdom);
    const paramsWithChosenTask = {
      ...defaultGameParams,
      task_id: 1,
    };

    await user.click(await findByRole('button', { name: 'task1 name' }));
    await user.click(getByRole('button', { name: 'Create battle' }));

    expect(lobbyMiddlewares.createGame).toHaveBeenCalledWith(paramsWithChosenTask);
  });

  test('with random task with chosen tags', async () => {
    const { findByRole, getByRole, user } = setup(vdom);
    const paramsWithChosenTags = {
      ...defaultGameParams,
      task_tags: ['math', 'string'],
    };

    await user.click(await findByRole('button', { name: 'math' }));
    await user.click(getByRole('button', { name: 'string' }));
    await user.click(getByRole('button', { name: 'Create battle' }));

    expect(lobbyMiddlewares.createGame).toHaveBeenCalledWith(paramsWithChosenTags);
  });

  test('with chosen task and changed level', async () => {
    const { findByRole, getByRole, getByTitle, user } = setup(vdom);
    const paramsWithChosenTaskAndChangedLevel = {
      ...defaultGameParams,
      level: 'easy',
      task_id: 7,
    };

    await user.click(getByTitle('easy'));
    await user.click(await findByRole('button', { name: 'task7 name' }));
    await user.click(getByRole('button', { name: 'Create battle' }));

    expect(lobbyMiddlewares.createGame).toHaveBeenCalledWith(paramsWithChosenTaskAndChangedLevel);
  });

  test('with opponent and random task', async () => {
    const { findByRole, getByRole, user } = setup(vdom);
    const paramsWithOpponent = {
      ...omit(defaultGameParams, ['opponent_type']),
      recipient_id: -4,
      recipient_name: 'user1',
    };

    await user.click(getByRole('button', { name: 'With a friend' }));

    const createInviteButton = getByRole('button', { name: 'Create invite' });

    expect(createInviteButton).toBeDisabled();

    await user.click(await findByRole('button', { name: 'user1' }));

    expect(createInviteButton).toBeEnabled();

    await user.click(createInviteButton);

    expect(invitesMiddleware.createInvite).toHaveBeenCalledWith(paramsWithOpponent);
  });

  test('with opponent and chosen task', async () => {
    const { findByRole, getByRole, user } = setup(vdom);
    const paramsWithOpponentAndChosenTask = {
      ...omit(defaultGameParams, ['opponent_type']),
      recipient_id: -4,
      recipient_name: 'user1',
      task_id: 1,
    };

    await user.click(getByRole('button', { name: 'With a friend' }));
    await user.click(await findByRole('button', { name: 'user1' }));
    await user.click(getByRole('button', { name: 'task1 name' }));
    await user.click(getByRole('button', { name: 'Create invite' }));

    expect(invitesMiddleware.createInvite).toHaveBeenCalledWith(paramsWithOpponentAndChosenTask);
  });
});

test('filter tasks by level', async () => {
  const { findByTitle, findByRole, queryByRole, user } = setup(vdom);

  const easyLevelButton = await findByTitle('easy');
  await findByRole('button', { name: elementaryTasksFromBackend[0].name });

  elementaryTasksFromBackend.forEach((task) =>
    expect(queryByRole('button', { name: task.name })).toBeInTheDocument(),
  );
  easyTasksFromBackend.forEach((task) =>
    expect(queryByRole('button', { name: task.name })).not.toBeInTheDocument(),
  );

  await user.click(easyLevelButton);

  easyTasksFromBackend.forEach((task) =>
    expect(queryByRole('button', { name: task.name })).toBeInTheDocument(),
  );
  elementaryTasksFromBackend.forEach((task) =>
    expect(queryByRole('button', { name: task.name })).not.toBeInTheDocument(),
  );
});

test('filter tasks by tags', async () => {
  const { findByRole, getByRole, queryByRole, user } = setup(vdom);

  const mathTag = await findByRole('button', { name: 'math' });
  const stringTag = getByRole('button', { name: 'string' });
  const asdTag = getByRole('button', { name: 'asd' });
  const restTag = getByRole('button', { name: 'rest' });

  expect(mathTag).toBeEnabled();
  expect(stringTag).toBeEnabled();
  expect(asdTag).toBeEnabled();
  expect(restTag).toBeEnabled();

  await user.click(restTag);
  await user.click(await findByRole('button', { name: 'task5 name' }));

  expect(mathTag).toBeDisabled();
  expect(stringTag).toBeDisabled();
  expect(asdTag).toBeDisabled();
  expect(restTag).toBeDisabled();

  await user.click(await findByRole('button', { name: /random task/ }));

  await waitFor(() => {
    tasksMatchingRestTags.forEach((task) =>
      expect(getByRole('button', { name: task.name })).toBeInTheDocument(),
    );

    tasksUnsuitableForRestTags.forEach((task) =>
      expect(queryByRole('button', { name: task.name })).not.toBeInTheDocument(),
    );
  });

  await user.click(restTag);

  await waitFor(() => {
    elementaryTasksFromBackend.forEach((task) =>
      expect(getByRole('button', { name: task.name })).toBeInTheDocument(),
    );
  });

  await user.click(mathTag);

  await waitFor(() => {
    tasksMatchingMathTag.forEach((task) =>
      expect(getByRole('button', { name: task.name })).toBeInTheDocument(),
    );
    tasksUnsuitableForMathTag.forEach((task) =>
      expect(queryByRole('button', { name: task.name })).not.toBeInTheDocument(),
    );
  });

  await user.click(stringTag);

  await waitFor(() => {
    tasksMatchingMathAndStringTags.forEach((task) =>
      expect(getByRole('button', { name: task.name })).toBeInTheDocument(),
    );
    tasksUnsuitableForMathAndStringTags.forEach((task) =>
      expect(queryByRole('button', { name: task.name })).not.toBeInTheDocument(),
    );
  });

  await user.click(mathTag);
  await user.click(stringTag);

  await waitFor(() => {
    elementaryTasksFromBackend.forEach((task) =>
      expect(getByRole('button', { name: task.name })).toBeInTheDocument(),
    );
  });
}, 6000);

test('filter tasks by name', async () => {
  const { getByRole, findByRole, queryByRole, user } = setup(vdom);

  await user.click(await findByRole('button', { name: 'filter tasks by name' }));

  await waitFor(() => {
    tasksFilteredByName.forEach((task) =>
      expect(getByRole('button', { name: task.name })).toBeInTheDocument(),
    );
    tasksEliminatedByName.forEach((task) =>
      expect(queryByRole('button', { name: task.name })).not.toBeInTheDocument(),
    );
  });
});

test('filter tasks by name and tags', async () => {
  const { getByRole, findByRole, queryByRole, user } = setup(vdom);

  await user.click(await findByRole('button', { name: 'filter tasks by name' }));
  await user.click(getByRole('button', { name: 'math' }));

  tasksFilteredByNameAndTag.forEach((task) =>
    expect(queryByRole('button', { name: task.name })).toBeInTheDocument(),
  );
  tasksEliminatedByNameAndTag.forEach((task) =>
    expect(queryByRole('button', { name: task.name })).not.toBeInTheDocument(),
  );
});
