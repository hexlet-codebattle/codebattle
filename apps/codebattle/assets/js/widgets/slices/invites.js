import { createSlice, createEntityAdapter } from '@reduxjs/toolkit';

const invitesAdapter = createEntityAdapter();

const initialState = invitesAdapter.getInitialState();

const invitesSlice = createSlice({
  name: 'invites',
  initialState,
  reducers: {
    setInvites: (state, action) => invitesAdapter.setAll(state, action.payload.invites),
    addInvite: (state, action) => invitesAdapter.upsertOne(state, action.payload.invite),
    updateInvite: (state, action) => invitesAdapter.upsertOne(state, action.payload.invite),
  },
});

export default invitesSlice.reducer;
export const { actions } = invitesSlice;
export const selectors = invitesAdapter.getSelectors((state) => state.invites);
