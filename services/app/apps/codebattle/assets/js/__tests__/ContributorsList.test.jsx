import React from 'react';

import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import axios from 'axios';
import { Provider } from 'react-redux';

import ContributorsList from '../widgets/pages/game/ContributorsList';
import reducers from '../widgets/slices';

jest.mock(
  'gon',
  () => {
    const gonParams = { local: 'en' };
    return { getAsset: (type) => gonParams[type] };
  },
  { virtual: true },
);

jest.mock('axios');
const users = [];
axios.get.mockResolvedValue({ data: users });

test('rendering of ContributorsList', async () => {
  const reducer = combineReducers(reducers);

  const preloadedState = {
    user: '',
  };
  const store = configureStore({
    reducer,
    preloadedState,
  });
  const { findByText } = render(
    <Provider store={store}>
      <ContributorsList />
    </Provider>,
  );
  expect(await findByText(/This users have contributed to this task:/)).toBeInTheDocument();
});
