import { createSlice } from "@reduxjs/toolkit";

import initial from "./initial";

const initialState = initial.reports;

const reports = createSlice({
  name: "reports",
  initialState,
  reducers: {
    setReports: (_state, { payload }) => ({
      list: payload,
    }),
    addReport: (state, { payload }) => ({
      list: [...state.list, payload],
    }),
    updateReport: (state, { payload }) => ({
      list: state.list.map((r) => {
        if (r.id === payload.id) {
          return { ...r, ...payload };
        }

        return r;
      }),
    }),
    removeReport: (state, { payload }) => ({
      list: state.list.filter((r) => r.id !== payload),
    }),
  },
});

const { actions, reducer } = reports;

export { actions };
export default reducer;
