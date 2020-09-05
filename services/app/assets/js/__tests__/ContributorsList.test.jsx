import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import axios from 'axios';

import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';

import reducers from '../widgets/slices';
import ContributorsList from '../widgets/components/ContributorsList';

jest.mock('gon', () => {
  const gonParams = { local: 'en' };
  return { getAsset: type => gonParams[type] };
}, { virtual: true });

jest.mock('axios');
const users = [];
axios.get.mockResolvedValue({ data: users });

test('rendering ContributorsList', async () => {
  const reducer = combineReducers(reducers);

  const preloadedState = {
    name: '',
  };
  const store = configureStore({
    reducer,
    preloadedState,
  });

  const { getByText } = render(<Provider store={store}><ContributorsList /></Provider>);

  expect(getByText(/This users have contributed to this task:/)).toBeInTheDocument();
});
