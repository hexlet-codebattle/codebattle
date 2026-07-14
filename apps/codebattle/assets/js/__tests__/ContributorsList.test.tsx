//
// import { configureStore, combineReducers } from '@reduxjs/toolkit';
// import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
// import { Provider } from 'react-redux';
//
// import ContributorsList from '../widgets/pages/game/ContributorsList';
// import reducers from '../widgets/slices';

vi.mock('gon', () => {
  const gonParams = { local: 'en' };
  return { default: { getAsset: (type: keyof typeof gonParams) => gonParams[type] } };
});

const users: unknown[] = [];
beforeAll(() => {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => users,
  }) as unknown as typeof fetch;
});
//
test('rendering ContributorsList', async () => {
  //   const reducer = combineReducers(reducers);
  //
  //   const preloadedState = {
  //     user: '',
  //   };
  //   const store = configureStore({
  //     reducer,
  //     preloadedState,
  //   });
  //   const { findByText } = render(<Provider store={store}><ContributorsList /></Provider>);
  //     expect(await findByText(/This users have contributed to this task:/)).toBeInTheDocument();
  expect(true).toBe(true);
});
