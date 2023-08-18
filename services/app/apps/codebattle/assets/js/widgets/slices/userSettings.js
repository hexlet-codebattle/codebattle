import Gon from 'gon';
import axios from 'axios';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import capitalize from 'lodash/capitalize';

const userSettings = Gon.getAsset('current_user');

const createValidationErrors = response => {
  const [fieldName] = Object.keys(response.data.errors);
  const [errorMessage] = response.data.errors[fieldName];
  const normalizedErrorMessage = capitalize(errorMessage);
  return {
    errorMessage: normalizedErrorMessage,
    field_errors: { [fieldName]: normalizedErrorMessage },
  };
};

const csrfToken = document?.querySelector("meta[name='csrf-token']")?.getAttribute('content');
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
      const validationErrors = createValidationErrors(error.response);
      return rejectWithValue(validationErrors);
    }
  },
);

const initialState = {
  ...userSettings,
  error: '',
  mute: JSON.parse(localStorage.getItem('ui_mute_sound')),
};

const userSettingsSlice = createSlice({
  name: 'userSettings',
  initialState,
  reducers: {
    toggleMuteSound: state => {
      localStorage.setItem('ui_mute_sound', !state.mute);
      return ({ ...state, mute: !state.mute });
    },
  },
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
