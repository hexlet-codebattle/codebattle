import React from 'react';

import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import axios from 'axios';
import { Provider } from 'react-redux';

import RatingList from '../widgets/pages/rating/RatingList';
import reducers from '../widgets/slices';

jest.mock('@fortawesome/react-fontawesome', () => ({
  FontAwesomeIcon: 'img',
}));

jest.mock('gon', () => {
  const gonParams = { local: 'en', current_user: { sound_settings: {} } };
  return { getAsset: type => gonParams[type] };
}, { virtual: true });

jest.mock('axios');
axios.get.mockResolvedValue({
  data: {
    users: [],
    pageInfo: { totalEntries: 0 },
    dateFrom: null,
    withBots: false,
  },
});

test('test rendering RatingList', async () => {
  const reducer = combineReducers(reducers);
  const store = configureStore({
    reducer,
    preloadedState: {},
  });

  const { findByText } = render(<Provider store={store}><RatingList /></Provider>);

  expect(await findByText(/Users rating/)).toBeInTheDocument();
  expect(await findByText(/Total entries: 0/)).toBeInTheDocument();
});
