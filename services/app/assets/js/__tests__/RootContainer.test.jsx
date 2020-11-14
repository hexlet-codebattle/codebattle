import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import axios from 'axios';

import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import RootContainer from '../widgets/containers/RootContainer';
import reducers from '../widgets/slices';
import userTypes from '../widgets/config/userTypes';
import GameStatusCodes from '../widgets/config/gameStatusCodes';

jest.mock('gon', () => {
  const gonParams = { local: 'en', game_id: 10 };
  return { getAsset: type => gonParams[type] };
}, { virtual: true });

jest.mock('axios');
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

test('test rendering active game components', async () => {
  const reducer = combineReducers(reducers);

  const createPlayer = params => ({
    ...params,
    name: '',
    githubId: 0,
    rating: 0,
    ratingDiff: 0,
    lang: 'js',
  });
  const players = {
    1: createPlayer({ type: userTypes.firstPlayer, id: 1 }),
    2: createPlayer({ type: userTypes.secondPlayer, id: 2 }),
  };

  const preloadedState = {
    game: {
      gameStatus: { status: GameStatusCodes.playing, checking: {} },
      task: { name: '', description: '', level: 'medium' },
      players,
    },
    editor: {},
    usersInfo: { 1: {}, 2: {} },
    storeLoaded: true,
  };
  const store = configureStore({
    reducer,
    preloadedState,
  });

  render(<Provider store={store}><RootContainer /></Provider>);

  expect(screen.getByText(/Online users:/)).toBeInTheDocument();
  expect(screen.getByText(/Task/)).toBeInTheDocument();
});
