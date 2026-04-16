import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  status: "loading", // "loading" | "active" | "finished"
  projectStatus: "loading", // "created" | "loading",
  projectLink: null, // string | null
  invite: {
    state: "loading", // "creating" | "pending" | "accepted" | "failed" | "loading"
    inviteLink: null,
  },
  externalSetup: null,
  solutionEvolution: [], // Array<{ id: string, status: "creating" | "finished" }>
  logs: [], // Array<object>
  code: "",
  langSlug: "",
};

const groupTournament = createSlice({
  name: "groupTournament",
  initialState,
  reducers: {
    setGroupTournamentData: (state, { payload }) => ({
      ...state,
      ...payload,
      invite: {
        ...state.invite,
        ...(payload.invite || {}),
      },
    }),
    updateGroupTournamentData: (state, { payload }) => ({
      ...state,
      ...payload,
    }),
    updateGroupTournamentStatus: (state, { payload }) => {
      state.status = payload;
    },
    updateInviteState: (state, { payload }) => {
      state.invite.state = payload;
    },
    updateInviteLink: (state, { payload }) => {
      state.invite.inviteLink = payload;
    },
    addSolutionEvolution: (state, { payload }) => {
      state.solutionEvolution.push(payload);
    },
    updateSolutionEvolutionStatus: (state, { payload }) => {
      const { id, status } = payload;
      const solutionEvolutionItem = state.solutionEvolution.find((item) => item.id === id);
      if (solutionEvolutionItem) {
        solutionEvolutionItem.status = status;
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
