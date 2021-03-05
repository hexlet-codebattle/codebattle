import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  list: [],
};

const invitesSlice = createSlice({
  name: 'invites',
  initialState,
  reducers: {
    setInvites: (state, { payload: { invites } }) => ({
      ...state,
      list: invites,
    }),
    addInvites: (state, { payload: { invite } }) => ({
      ...state,
      list: [...state.list, invite],
    }),
    updateInvites: (state, { payload: { invite } }) => ({
      ...state,
      list: state.list.map(value => {
        if (invite.id === value.id) {
          return invite;
        }

        return value;
      }),
    }),
  },
});

const { actions, reducer } = invitesSlice;

export { actions };

export default reducer;
