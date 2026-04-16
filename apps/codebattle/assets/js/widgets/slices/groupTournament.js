import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  status: "loading", // "loading" | "active" | "finished"
  projectStatus: "loading", // "created" | "loading",
  projectLink: null, // string | null
  invite: {
    status: "pending", // "creating" | "pending" | "accepted" | "rejected" | "loading"
    inviteLink: null,
  },
  solutionEvolution: [], // Array<{ id: string, status: "creating" | "finished" }>
  logs: [], // Array<object>
  code: "",
  langSlug: "",
};

const groupTournament = createSlice({
  name: "groupTournament",
  initialState,
  reducers: {
    setGroupTournamentData: (_state, { payload }) => ({
      ..._state
      // ...payload,
    }),
    updateGroupTournamentData: (state, { payload }) => ({
      ...state,
      ...payload,
    }),
    updateGroupTournamentStatus: (state, { payload }) => {
      state.status = payload;
    },
    updateInviteStatus: (state, { payload }) => {
      state.invite.status = payload;
    },
    updateInviteLink: (state, { payload }) => {
      state.invite.inviteLink = payload;
    },
    addSolutionEvolution: (state, { payload }) => {
      state.solutionEvolution.push(payload);
    },
    updateSolutionEvolutionStatus: (state, { payload }) => {
      const { id, status } = payload;
      const item = state.solutionEvolution.find(item => item.id === id);
      if (item) {
        item.status = status;
      }
    },
    addLog: (state, { payload }) => {
      state.logs.push(payload);
    },
    updateCode: (state, { payload }) => {
      state.code = payload;
    },
    updateLangSlug: (state, { payload }) => {
      state.langSlug = payload;
    },
    resetGroupTournament: () => initialState,
  },
});

export const { actions } = groupTournament;
export default groupTournament.reducer;
