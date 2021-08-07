import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import axios from 'axios';
import { Machine } from 'xstate';

import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import RootContainer from '../widgets/containers/RootContainer';

import reducers from '../widgets/slices';
import userTypes from '../widgets/config/userTypes';
import GameStatusCodes from '../widgets/config/gameStatusCodes';

import game from '../widgets/machines/game';
import editor from '../widgets/machines/editor';

const createPlayer = params => ({
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
      current_user: { sound_settings: {} },
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

test('test rendering preview game component', async () => {
  const reducer = combineReducers(reducers);

  const players = {
    1: createPlayer({
      name: 'John Kramer',
      type: userTypes.firstPlayer,
      id: 1,
    }),
    2: createPlayer({ name: 'Tim Urban', type: userTypes.secondPlayer, id: 2 }),
  };

  const preloadedState = {
    game: {
      user: { currentUserId: 1, users: players },
      gameStatus: {
        status: GameStatusCodes.playing,
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
  };

  game.states.game.initial = 'active';
  editor.initial = 'idle';

  const store = configureStore({
    reducer,
    preloadedState,
  });

  render(
    <Provider store={store}>
      <RootContainer gameMachine={Machine(game)} editorMachine={Machine(editor)} />
    </Provider>,
  );

  waitFor(() => {
    expect(screen.getByText(/Examples:/)).toBeInTheDocument();
    expect(screen.getByTitle('Reset Editor')).toBeInTheDocument();
  });
});
