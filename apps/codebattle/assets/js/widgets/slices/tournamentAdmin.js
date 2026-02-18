import { createSlice } from "@reduxjs/toolkit";

import initial from "./initial";

const tournamentAdminSlice = createSlice({
  name: "tournamentAdmin",
  initialState: initial.tournamentAdmin,
  reducers: {
    setAdminActiveGameId: (state, { payload }) => {
      state.activeGameId = payload;
    },
  },
});

const { actions, reducer } = tournamentAdminSlice;

export { actions };

export default reducer;
