import { createSlice, createEntityAdapter, type PayloadAction } from '@reduxjs/toolkit';

export interface Invite {
  id: number;
  [key: string]: unknown;
}

const invitesAdapter = createEntityAdapter<Invite>();

const initialState = invitesAdapter.getInitialState();

export type InvitesState = typeof initialState;

const invitesSlice = createSlice({
  name: 'invites',
  initialState,
  reducers: {
    setInvites: (state, action: PayloadAction<{ invites: Invite[] }>) =>
      invitesAdapter.setAll(state, action.payload.invites),
    addInvite: (state, action: PayloadAction<{ invite: Invite }>) =>
      invitesAdapter.upsertOne(state, action.payload.invite),
    updateInvite: (state, action: PayloadAction<{ invite: Invite }>) =>
      invitesAdapter.upsertOne(state, action.payload.invite),
  },
});

export default invitesSlice.reducer;
export const { actions } = invitesSlice;
export const selectors = invitesAdapter.getSelectors(
  (state: { invites: InvitesState }) => state.invites,
);
