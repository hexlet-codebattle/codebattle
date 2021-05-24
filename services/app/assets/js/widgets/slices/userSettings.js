import Gon from 'gon';
import axios from 'axios';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

const userSettings = Gon.getAsset('current_user');
let csrfToken;

if (process.browser) {
  // for testing purposes
  csrfToken = document
    .querySelector("meta[name='csrf-token']")
    .getAttribute('content');
}
export const updateUserSettings = createAsyncThunk(
  'userSettings/update',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await axios.patch('/api/v1/settings', userData, {
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
      });
      return response.data;
    } catch (err) {
      const error = err;
      if (!error.response) {
        throw err;
      }
      return rejectWithValue(error.response.data);
    }
  },
);

const initialState = {
  ...userSettings,
  error: '',
};

const userSettingsSlice = createSlice({
  name: 'userSettings',
  initialState,
  reducers: {},
  extraReducers: builder => {
    // The `builder` callback form is used here because it provides correctly typed reducers from the action creators
    builder.addCase(updateUserSettings.fulfilled, (state, { payload }) => {
      Object.assign(state, payload);
    });
    builder.addCase(updateUserSettings.rejected, (state, action) => {
      if (action.payload) {
        // Being that we passed in ValidationErrors to rejectType in `createAsyncThunk`, the payload will be available here.
        state.error = action.payload.errorMessage;
      } else {
        state.error = action.error.message;
      }
    });
  },
});

const { actions, reducer } = userSettingsSlice;

export { actions };

export default reducer;
