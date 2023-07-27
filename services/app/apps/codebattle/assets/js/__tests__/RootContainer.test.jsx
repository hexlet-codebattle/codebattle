import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import axios from 'axios';
import { Machine } from 'xstate';

import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import RootContainer from '../widgets/containers/RootContainer';

import reducers from '../widgets/slices';
import userTypes from '../widgets/config/userTypes';
import GameStateCodes from '../widgets/config/gameStateCodes';
import GameModes from '../widgets/config/gameModes';

import game from '../widgets/machines/game';
import editor from '../widgets/machines/editor';

const createPlayer = params => ({
  is_admin: false,
  id: 0,
  name: '',
  githubId: 0,
  rating: 0,
  ratingDiff: 0,
  lang: 'js',
  ...params,
});

jest.mock(
  'gon',
  () => {
    const gonParams = {
      local: 'en',
      current_user: { id: 1, sound_settings: {} },
      game_id: 10,
      players: [
        createPlayer({ name: 'Tim Urban' }),
        createPlayer({ name: 'John Kramer' }),
      ],
    };

    return { getAsset: type => gonParams[type] };
  },
  { virtual: true },
);

jest.mock('axios');
jest.mock('../widgets/containers/EditorContainer', () => () => <></>);

axios.get.mockResolvedValue({ data: {} });

jest.mock('react-select', () => ({ options, value, onChange }) => {
  function handleChange(event) {
    const option = options.find(
      opt => opt.value === event.currentTarget.value,
    );
    onChange(option);
  }
  return (
    <select data-testid="select" value={value} onChange={handleChange}>
      {options.map(({ label, val }) => (
        <option key={val} value={val}>
          {label}
        </option>
      ))}
    </select>
  );
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
            receive: jest.fn(() => channel),
            on: jest.fn(),
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

const players = {
  1: createPlayer({
    name: 'John Kramer',
    type: userTypes.firstPlayer,
    id: 1,
  }),
  2: createPlayer({
    name: 'Tim Urban',
    type: userTypes.secondPlayer,
    id: -1,
    isBot: true,
  }),
};

const preloadedState = {
  user: { currentUserId: 1, users: players },
  game: {
    gameStatus: {
      state: GameStateCodes.playing,
      mode: GameModes.standard,
      checking: {},
      startsAt: '0',
    },
    task: {
      id: 0,
      name: '',
      description: '',
      examples: '',
      level: 'medium',
    },
    players,
  },
  editor: {
    meta: {
      1: { userId: 1, currentLangSlug: 'js' },
      2: { userId: 2, currentLangSlug: 'js' },
    },
    text: {
      '1:js': '',
      '2:js': '',
    },
  },
  usersInfo: {
    1: { },
    2: { },
  },
  chat: {
    users: Object.values(players),
    messages: [
      {
        id: 1,
        name: 'Tim Urban',
        text: 'bot message',
        type: 'text',
        time: 1679056894,
        userId: -1,
      },
    ],
    activeRoom: { name: 'General', targetUserId: null },
    rooms: [{ name: 'General', targetUserId: null }],
    history: {
      messages: [],
    },
  },
};

game.states.room.initial = 'active';
editor.initial = 'idle';

test('test rendering preview game component', () => {
  const store = configureStore({
    reducer,
    preloadedState,
  });

  render(
    <Provider store={store}>
      <RootContainer gameMachine={Machine(game)} editorMachine={Machine(editor)} />
    </Provider>,
  );

  expect(screen.getByText(/Examples:/)).toBeInTheDocument();
});

test('test game guide', async () => {
  const store = configureStore({
    reducer,
    preloadedState,
  });

  const { getByRole } = render(
    <Provider store={store}>
      <RootContainer gameMachine={Machine(game)} editorMachine={Machine(editor)} />
    </Provider>,
  );

  const showGuideButton = getByRole('button', { name: 'Show guide' });

  fireEvent.click(showGuideButton);

  const closeGuideButton = getByRole('button', { name: 'Close' });
  expect(closeGuideButton).toBeInTheDocument();

  fireEvent.click(closeGuideButton);

  expect(closeGuideButton).not.toBeInTheDocument();
});

test('test a bot invite button', () => {
  const store = configureStore({
    reducer,
    preloadedState,
  });

  const { getByLabelText, getByTitle } = render(
    <Provider store={store}>
      <RootContainer gameMachine={Machine(game)} editorMachine={Machine(editor)} />
    </Provider>,
  );

  const target = getByTitle('Message (Tim Urban)');
  fireEvent.contextMenu(target, { button: 2 });

  expect(getByLabelText('Send an invite')).toHaveAttribute('aria-disabled', 'true');
});
