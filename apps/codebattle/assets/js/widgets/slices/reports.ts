import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import initial, { type ReportsState } from './initial';

interface Report {
  id: number;
  [key: string]: unknown;
}

const initialState = initial.reports;

const reports = createSlice({
  name: 'reports',
  initialState,
  reducers: {
    setReports: (_state, { payload }: PayloadAction<Report[]>) => ({
      list: payload,
    }),
    addReport: (state, { payload }: PayloadAction<Report>) => ({
      list: [...state.list, payload],
    }),
    updateReport: (state, { payload }: PayloadAction<Report>) => ({
      list: state.list.map((r) => {
        if (r.id === payload.id) {
          return { ...r, ...payload };
        }

        return r;
      }),
    }),
    removeReport: (state, { payload }: PayloadAction<number>) => ({
      list: state.list.filter((r) => r.id !== payload),
    }),
  },
});

export type { ReportsState };

const { actions, reducer } = reports;

export { actions };
export default reducer;
