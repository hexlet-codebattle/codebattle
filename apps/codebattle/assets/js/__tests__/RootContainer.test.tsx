import NiceModal from '@ebay/nice-modal-react';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import React, { type ReactElement } from 'react';
import { Provider } from 'react-redux';
import { createMachine } from 'xstate';

import GameRoomModes from '../widgets/config/gameModes';
import GameStateCodes from '../widgets/config/gameStateCodes';
import userTypes from '../widgets/config/userTypes';
import editor, { config as editorConfig } from '../widgets/machines/editor';
import game, { config as gameConfig } from '../widgets/machines/game';
import task, { config as taskConfig } from '../widgets/machines/task';
import RootContainer from '../widgets/pages/RoomWidget';
import reducers from '../widgets/slices';

vi.mock('pixelmatch', () => ({ default: () => {} }));

vi.mock('monaco-editor', () => ({
  editor: {
    defineTheme: () => {},
    create: () => ({
      dispose: () => {},
      onDidChangeModelContent: () => {},
      setValue: () => {},
      getValue: () => {},
      getModel: () => {},
      focus: () => {},
    }),
  },
}));

vi.mock('monaco-vim', () => ({
  VimMode: class {
    constructor() {
      return {
        dispose: () => {},
      };
    }
  },
}));

vi.mock('../widgets/initEditor', () => ({ default: () => {} }));

vi.mock('../widgets/pages/game/TaskDescriptionMarkdown', () => ({
  default: function () {
    return <>Examples: </>;
  },
}));

vi.mock('@fortawesome/react-fontawesome', () => ({
  FontAwesomeIcon: 'img',
}));

const createPlayer = (params: Record<string, unknown>) => ({
  isAdmin: false,
  id: 0,
  name: '',
  githubId: 0,
  rating: 0,
  ratingDiff: 0,
  lang: 'js',
  ...params,
});

vi.mock('@/inertia/pageProps', () => {
  const pageProps = {
    local: 'en',
    current_user: { id: 1, sound_settings: {} },
    game_id: 10,
    players: [
      {
        isAdmin: false,
        id: 0,
        name: 'Tim Urban',
        githubId: 0,
        rating: 0,
        ratingDiff: 0,
        lang: 'js',
      },
      {
        isAdmin: false,
        id: 0,
        name: 'John Kramer',
        githubId: 0,
        rating: 0,
        ratingDiff: 0,
        lang: 'js',
      },
    ],
    game: {
      state: '',
      players: [],
      langs: [],
    },
  };

  return {
    getPageProp: (key: keyof typeof pageProps, fallback?: unknown) => pageProps[key] ?? fallback,
  };
});

vi.mock('../widgets/pages/game/EditorContainer', () => ({
  default: function EditorContainer() {
    return <></>;
  },
}));

vi.mock('../widgets/components/FeedbackWidget', () => ({
  default: function FeedbackWidget() {
    return <></>;
  },
}));

vi.mock('../widgets/utils/useStayScrolled', () => ({
  default: () => ({ stayScrolled: () => {} }),
}));

beforeAll(() => {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({}),
  }) as unknown as typeof fetch;
});

vi.mock('phoenix', async () => {
  const originalModule = await vi.importActual('phoenix');

  return {
    __esModule: true,
    ...originalModule,
    Socket: vi.fn().mockImplementation(function () {
      return {
        channel: vi.fn(() => {
          const channel = {
            join: vi.fn(() => channel),
            leave: vi.fn(() => channel),
            receive: vi.fn(() => channel),
            on: vi.fn(),
            off: vi.fn(),
            push: vi.fn(),
            onError: vi.fn(),
          };

          return channel;
        }),
        connect: vi.fn(() => {}),
      };
    }),
  };
});

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

const setup = (jsx: ReactElement) => ({
  user: userEvent.setup(),
  ...render(jsx),
});

test('rendering preview game component', async () => {
  const store = configureStore({
    reducer,
    preloadedState: preloadedState as never,
  });

  const { findByText } = setup(
    <Provider store={store}>
      <NiceModal.Provider>
        <RootContainer
          pageName="game"
          mainMachine={createMachine(game as never).provide(gameConfig as never)}
          taskMachine={createMachine(task as never).provide(taskConfig as never)}
          editorMachine={createMachine(editor as never).provide(editorConfig as never)}
        />
      </NiceModal.Provider>
    </Provider>,
  );

  expect(await findByText(/Examples:/)).toBeInTheDocument();
});

test('a bot invite button', async () => {
  const store = configureStore({
    reducer,
    preloadedState: preloadedState as never,
  });

  const { findByLabelText, findByTitle, user } = setup(
    <Provider store={store}>
      <NiceModal.Provider>
        <RootContainer
          pageName="game"
          mainMachine={createMachine(game as never).provide(gameConfig as never)}
          taskMachine={createMachine(task as never).provide(taskConfig as never)}
          editorMachine={createMachine(editor as never).provide(editorConfig as never)}
        />
      </NiceModal.Provider>
    </Provider>,
  );

  const target = await findByTitle('Message (Tim Urban)');
  await user.pointer({ keys: '[MouseLeft]', target });

  expect(await findByLabelText('Send an invite')).toHaveAttribute('aria-disabled', 'true');
});
