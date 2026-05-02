import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  status: "loading", // "loading" | "active" | "finished"
  projectStatus: "loading", // "created" | "loading",
  projectLink: null, // string | null
  invite: {
    state: "loading", // "creating" | "pending" | "accepted" | "failed" | "loading"
    inviteLink: null,
  },
  requireInvitation: true,
  runOnExternalPlatform: false,
  platformError: null,
  externalSetup: null,
  solutionEvolution: [], // Array<{ id: string, status: "creating" | "finished" }>
  code: "",
  langSlug: "",
  data: {},
  activeRunIdFromServer: null,
  activeRunFromServerTick: 0,
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
    mergeGroupTournament: (state, { payload }) => {
      state.data = state.data || {};
      state.data.groupTournament = {
        ...(state.data.groupTournament || {}),
        ...payload,
      };
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
    updateCode: (state, { payload }) => {
      state.code = payload;
    },
    updateLangSlug: (state, { payload }) => {
      state.langSlug = payload;
    },
    setData: (state, { payload }) => {
      state.data = payload;
    },
    setActiveRunIdFromServer: (state, { payload }) => {
      state.activeRunIdFromServer = payload;
      state.activeRunFromServerTick = (state.activeRunFromServerTick || 0) + 1;
    },
    applyRunStub: (state, { payload }) => {
      const { groupTournamentId, userId, runId, status, score, playerIds, insertedAt } = payload;

      state.data = state.data || {};

      const run = {
        id: runId,
        groupTournamentId,
        userId,
        status,
        score,
        playerIds,
        insertedAt,
        detailsLoaded: false,
      };
      const currentRuns = state.data.runs || [];
      const existingRunIndex = currentRuns.findIndex((item) => item.id === run.id);

      if (existingRunIndex >= 0) {
        currentRuns[existingRunIndex] = { ...currentRuns[existingRunIndex], ...run };
      } else {
        currentRuns.unshift(run);
      }

      state.data.runs = currentRuns;

      if (runId) {
        state.activeRunIdFromServer = runId;
        state.activeRunFromServerTick = (state.activeRunFromServerTick || 0) + 1;
      }
    },
    applyRunDetails: (state, { payload }) => {
      const run = payload.run || payload;

      state.data = state.data || {};

      const currentRuns = state.data.runs || [];
      const nextRun = { ...run, detailsLoaded: true };
      const existingRunIndex = currentRuns.findIndex((item) => item.id === nextRun.id);

      if (existingRunIndex >= 0) {
        currentRuns[existingRunIndex] = { ...currentRuns[existingRunIndex], ...nextRun };
      } else {
        currentRuns.unshift(nextRun);
      }

      state.data.runs = currentRuns;
    },
    resetGroupTournament: () => initialState,
  },
});

export const { actions } = groupTournament;
export default groupTournament.reducer;
