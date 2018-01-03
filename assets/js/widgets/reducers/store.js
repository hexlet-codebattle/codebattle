import { handleActions } from 'redux-actions';
import * as actions from '../actions';

const initialState = false;

const storeLoaded = handleActions({
  [actions.finishStoreInit]() {
    return true;
  },
}, initialState);

export default storeLoaded;

