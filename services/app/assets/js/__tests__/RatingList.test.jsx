import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import axios from 'axios';

import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';

import reducers from '../widgets/slices';
import RatingList from '../widgets/containers/RatingList';

jest.mock('gon', () => {
  const gonParams = { local: 'en' };
  return { getAsset: type => gonParams[type] };
}, { virtual: true });

jest.mock('axios');
axios.get.mockResolvedValue({
  data: {
    users: [],
    pageInfo: { totalEntries: 0 },
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
  expect(getByText(/Total: 0/)).toBeInTheDocument();
});
