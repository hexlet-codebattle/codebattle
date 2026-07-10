import { createSlice } from '@reduxjs/toolkit';

const storeLoaded = createSlice({
  name: 'storeLoaded',
  initialState: false,
  reducers: {
    finishStoreInit: () => true,
  },
});

const { actions, reducer } = storeLoaded;

export { actions };
export default reducer;
