import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import axios from 'axios';

import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';

import reducers from '../widgets/slices';
import GameList from '../widgets/containers/GameList';

jest.mock('gon', () => {
  const gonParams = { local: 'en' };
  return { getAsset: type => gonParams[type] };
}, { virtual: true });

jest.mock('axios');
axios.get.mockResolvedValue({ data: {} });

test('test rendering GameList', async () => {
  const reducer = combineReducers(reducers);

  const preloadedState = {
    gameList: {
      activeGames: [
        {
          level: 'elementary', isBot: true, id: 1, players: [{ id: -1 }],
        },
        {
          level: 'easy', isBot: true, id: 2, players: [{ id: -2 }],
        },
        {
          level: 'medium', isBot: true, id: 3, players: [{ id: -3 }],
        },
        {
          level: 'hard', isBot: true, id: 4, players: [{ id: -4 }],
        },
      ],
      completedGames: [
        { level: 'elementary', players: [{ id: -4 }] },
      ],
      loaded: true,
      liveTournaments: [],
    },
  };
  const store = configureStore({
    reducer,
    preloadedState,
  });

  const { getByText } = render(<Provider store={store}><GameList /></Provider>);

  expect(getByText(/Active games/)).toBeInTheDocument();
  expect(getByText(/Active tournaments/)).toBeInTheDocument();
  expect(getByText(/Game activity/)).toBeInTheDocument();
  expect(getByText(/Completed games/)).toBeInTheDocument();
});
