import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import axios from 'axios';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';

import reducers from '../widgets/slices';
import RatingList from '../widgets/pages/Rating/RatingList';

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

  const preloadedState = {
    storeLoaded: true,
  };
  const store = configureStore({
    reducer,
    preloadedState,
  });

  const { getByText } = render(<Provider store={store}><RatingList /></Provider>);

  expect(getByText(/Users rating/)).toBeInTheDocument();
  expect(getByText(/Total entries: 0/)).toBeInTheDocument();
});
