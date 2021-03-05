import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  list: [],
};

const invites = createSlice({
  name: 'invites',
  initialState,
  reducers: {
    setInvites: (state, { payload: list }) => ({
      ...state,
      list,
    }),
    addInvites: (state, { payload: invite }) => ({
      ...state,
      list: [...state.list, invite],
    }),
    updateInvites: (state, { payload: invite }) => ({
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

const { actions, reducer } = invites;

export { actions };

export default reducer;
