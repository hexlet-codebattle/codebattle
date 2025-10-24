import React from 'react';

import NiceModal from '@ebay/nice-modal-react';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/extend-expect';
import axios from 'axios';
import { Provider } from 'react-redux';
import { createMachine } from 'xstate';

import GameRoomModes from '../widgets/config/gameModes';
import GameStateCodes from '../widgets/config/gameStateCodes';
import userTypes from '../widgets/config/userTypes';
import editor from '../widgets/machines/editor';
import game from '../widgets/machines/game';
import task from '../widgets/machines/task';
import waitingRoom from '../widgets/machines/waitingRoom';
import RootContainer from '../widgets/pages/RoomWidget';
import reducers from '../widgets/slices';

jest.mock('bad-words-next');
jest.mock('bad-words-next/lib/en');
jest.mock('bad-words-next/lib/ru');
jest.mock('bad-words-next/lib/ru_lat');

jest.mock('pixelmatch', () => ({}));

jest.mock('monaco-editor', () => ({
  editor: {
    defineTheme: () => { },
    create: () => ({
      dispose: () => { },
      onDidChangeModelContent: () => { },
      setValue: () => { },
      getValue: () => { },
      getModel: () => { },
      focus: () => { },
    }),
  },
}));

jest.mock('monaco-vim', () => ({
  VimMode: class {
    constructor() {
      return {
        dispose: () => { },
      };
    }
  },
}));

jest.mock('../widgets/initEditor.js', () => ({}));

jest.mock('../widgets/pages/game/TaskDescriptionMarkdown', () => () => (<>Examples: </>));

jest.mock('@fortawesome/react-fontawesome', () => ({
  FontAwesomeIcon: 'img',
}));

const createPlayer = params => ({
  isAdmin: false,
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
      game: {
        state: '',
        players: [],
        langs: [],
      },
    };

    return { getAsset: type => gonParams[type] };
  },
  { virtual: true },
);

jest.mock('axios');

jest.mock(
  '../widgets/pages/game/EditorContainer',
  () => function EditorContainer() {
    return <></>;
  },
);

jest.mock(
  '../widgets/components/FeedbackWidget',
  () => function FeedbackWidget() {
    return <></>;
  },
);

jest.mock(
  '../widgets/utils/useStayScrolled',
  () => () => ({ stayScrolled: () => { } }),
  { virtual: true },
);

axios.get.mockResolvedValue({ data: {} });

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
            leave: jest.fn(() => channel),
            receive: jest.fn(() => channel),
            on: jest.fn(),
            off: jest.fn(),
            push: jest.fn(),
            onError: jest.fn(),
          };

          return channel;
        }),
        connect: jest.fn(() => { }),
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
  user: {
    currentUserId: 1,
    users: players,
    settings: { mute: null },
  },
  game: {
    gameStatus: {
      state: GameStateCodes.playing,
      mode: GameRoomModes.standard,
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
    useChat: true,
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
    1: {},
    2: {},
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
    channel: { online: true },
    activeRoom: { name: 'General', targetUserId: null },
    rooms: [{ name: 'General', targetUserId: null }],
    history: {
      messages: [],
    },
  },
};

game.states.room.initial = 'active';
editor.initial = 'idle';

const setup = jsx => ({
  user: userEvent.setup(),
  ...render(jsx),
});

test('test rendering preview game component', async () => {
  const store = configureStore({
    reducer,
    preloadedState,
  });

  const { findByText } = setup(
    <Provider store={store}>
      <NiceModal.Provider>
        <RootContainer
          pageName="game"
          mainMachine={createMachine({ predictableActionArguments: true, ...game })}
          taskMachine={createMachine({ predictableActionArguments: true, ...task })}
          editorMachine={createMachine({ predictableActionArguments: true, ...editor })}
          waitingRoomMachine={createMachine({ predictableActionArguments: true, ...waitingRoom })}
        />
      </NiceModal.Provider>
    </Provider>,
  );

  expect(await findByText(/Examples:/)).toBeInTheDocument();
});

test('test a bot invite button', async () => {
  const store = configureStore({
    reducer,
    preloadedState,
  });

  const { findByLabelText, findByTitle, user } = setup(
    <Provider store={store}>
      <NiceModal.Provider>
        <RootContainer
          pageName="game"
          mainMachine={createMachine({ predictableActionArguments: true, ...game })}
          taskMachine={createMachine({ predictableActionArguments: true, ...task })}
          editorMachine={createMachine({ predictableActionArguments: true, ...editor })}
          waitingRoomMachine={createMachine({ predictableActionArguments: true, ...waitingRoom })}
        />
      </NiceModal.Provider>
    </Provider>,
  );

  const target = await findByTitle('Message (Tim Urban)');
  await user.pointer({ keys: '[MouseLeft]', target });

  expect(await findByLabelText('Send an invite')).toHaveAttribute('aria-disabled', 'true');
});
