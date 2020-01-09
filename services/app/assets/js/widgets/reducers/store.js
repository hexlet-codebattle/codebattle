import { createReducer } from '@reduxjs/toolkit';
import * as actions from '../actions';

const storeLoaded = createReducer(false, {
  [actions.finishStoreInit]() {
    return true;
  },
});

export default storeLoaded;
